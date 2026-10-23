"""Synthesises the promo's original 30-second soundtrack (120 BPM, one bar = 2 s).

Usage: python3 scripts/music.py public/music.wav

Every scene in src/Promo.tsx starts on a bar line, so the whooshes, the 6 s impact and the
chord changes all land on the cuts. Deterministic: the same file comes out every time.
"""

import sys
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
LENGTH = 30.0
N = int(SR * LENGTH)
rng = np.random.default_rng(7)

left = np.zeros(N)
right = np.zeros(N)


def midi(note: float) -> float:
    return 440.0 * 2 ** ((note - 69) / 12)


def add(signal: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.0) -> None:
    """Mixes a mono signal in at `at` seconds. pan -1 is left, +1 is right."""
    start = int(at * SR)
    if start >= N:
        return
    signal = signal[: N - start]
    left[start : start + len(signal)] += signal * gain * np.sqrt((1 - pan) / 2)
    right[start : start + len(signal)] += signal * gain * np.sqrt((1 + pan) / 2)


def t_axis(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * SR)) / SR


def smooth(x: np.ndarray, width: int) -> np.ndarray:
    """Moving-average low-pass."""
    return np.convolve(x, np.ones(width) / width, mode="same")


def envelope(length: float, attack: float, release: float) -> np.ndarray:
    t = t_axis(length)
    env = np.minimum(1, t / max(attack, 1e-4))
    tail = np.clip((length - t) / max(release, 1e-4), 0, 1)
    return env * tail


# --- Instruments -----------------------------------------------------------------------------

def pad(notes: list[int], length: float, brightness: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
    """Warm, slightly detuned chord; returns left and right so it sounds wide."""
    t = t_axis(length)
    out = []
    for detune in (-0.12, 0.12):
        voice = np.zeros_like(t)
        for note in notes:
            f = midi(note) * (1 + detune / 100)
            for k in range(1, 9):
                voice += np.sin(2 * np.pi * f * k * t + k) / k ** (1.9 - 0.4 * brightness)
        out.append(voice * envelope(length, 0.5, 0.8) / len(notes))
    return out[0], out[1]


def pluck(note: int, length: float = 0.35) -> np.ndarray:
    t = t_axis(length)
    f = midi(note)
    tone = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return tone * np.exp(-t * 11) * np.minimum(1, t / 0.003)


def bass(note: int, length: float = 0.24) -> np.ndarray:
    t = t_axis(length)
    f = midi(note)
    tone = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return tone * envelope(length, 0.005, 0.08)


def kick(gain: float = 1.0) -> np.ndarray:
    t = t_axis(0.45)
    freq = 45 + 85 * np.exp(-t * 28)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    click = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.25
    return (np.sin(phase) * np.exp(-t * 7) + click) * gain


def noise(seconds: float) -> np.ndarray:
    return rng.standard_normal(int(seconds * SR))


def clap() -> np.ndarray:
    n = noise(0.22)
    bright = n - smooth(n, 6)
    t = t_axis(0.22)
    # A clap is a few quick bursts.
    bursts = sum(np.exp(-np.clip(t - d, 0, None) * 60) * (t >= d) for d in (0, 0.011, 0.022))
    return bright * bursts * np.exp(-t * 14) * 0.6


def hat(open_: bool = False) -> np.ndarray:
    length = 0.18 if open_ else 0.05
    n = noise(length)
    bright = n - smooth(n, 3)
    t = t_axis(length)
    return bright * np.exp(-t * (16 if open_ else 70)) * 0.35


def whoosh(length: float = 0.55) -> np.ndarray:
    """Noise that swells and brightens, peaking two-thirds of the way through."""
    n = noise(length)
    t = t_axis(length)
    peak = length * 0.6
    amp = np.exp(-((t - peak) ** 2) / (2 * (length / 5) ** 2))
    dark = smooth(n, 40)
    bright = n - smooth(n, 8)
    mix = np.clip(t / peak, 0, 1)
    return (dark * (1 - mix) * 3 + bright * mix) * amp * 0.5


def riser(length: float) -> np.ndarray:
    n = noise(length)
    t = t_axis(length)
    progress = t / length
    dark = smooth(n, 60) * 4
    bright = n - smooth(n, 6)
    return (dark * (1 - progress) + bright * progress) * progress ** 2.2 * 0.55


def impact() -> np.ndarray:
    t = t_axis(2.2)
    boom = np.sin(2 * np.pi * (38 + 30 * np.exp(-t * 6)) * t) * np.exp(-t * 2.4)
    n = noise(2.2)
    crash = (n - smooth(n, 4)) * np.exp(-t * 2.2) * 0.35
    return boom + crash


def space(x: np.ndarray, taps: tuple = ((0.087, 0.35), (0.131, 0.28), (0.193, 0.22), (0.271, 0.16), (0.389, 0.1))) -> np.ndarray:
    """Cheap room: a handful of decaying echoes."""
    out = x.copy()
    for delay, gain in taps:
        d = int(delay * SR)
        out[d:] += x[:-d] * gain
    return out


# --- Arrangement -----------------------------------------------------------------------------

# I–V–vi–IV in C, one chord per bar from the reveal (6 s) onwards.
CHORDS = {
    "C": [48, 55, 60, 64, 67],
    "G": [43, 55, 59, 62, 67],
    "Am": [45, 57, 60, 64, 69],
    "F": [41, 53, 57, 60, 65],
}
ROOTS = {"C": 36, "G": 31, "Am": 33, "F": 29}
ARP = {"C": [72, 76, 79, 84], "G": [71, 74, 79, 83], "Am": [72, 76, 81, 84], "F": [69, 72, 77, 81]}
PROGRESSION = ["C", "G", "Am", "F"]

pad_l = np.zeros(N)
pad_r = np.zeros(N)
plucks = np.zeros(N)


def mix_into(track: np.ndarray, signal: np.ndarray, at: float, gain: float = 1.0) -> None:
    start = int(at * SR)
    signal = signal[: N - start]
    track[start : start + len(signal)] += signal * gain


# 0–4 s: the questions. A hushed Am9 pad, a slow pulse and a ticking clock.
l, r = pad([45, 52, 59, 60, 64], 4.4, brightness=0.2)
mix_into(pad_l, l, 0, 0.5)
mix_into(pad_r, r, 0, 0.5)
for beat in range(8):
    add(kick(0.35) * np.exp(-t_axis(0.45) * 4), beat * BEAT, 0.5)
    add(hat(), beat * BEAT + BEAT / 2, 0.35, pan=0.3)

# 4–6 s: "If you actually do them." Fmaj7 lifts, and a riser builds to the reveal.
l, r = pad([41, 53, 57, 60, 64], 2.4, brightness=0.6)
mix_into(pad_l, l, 4, 0.55)
mix_into(pad_r, r, 4, 0.55)
add(riser(2.0), 4.0, 0.9)

# 6 s: the reveal lands on an impact, then the groove runs to 28 s.
add(impact(), 6.0, 0.9)
GROOVE_START, GROOVE_END = 6.0, 28.0
bar_index = 0
at = GROOVE_START
while at < GROOVE_END - 1e-6:
    chord = PROGRESSION[bar_index % len(PROGRESSION)]
    l, r = pad(CHORDS[chord], BAR + 0.6, brightness=0.9)
    mix_into(pad_l, l, at, 0.42)
    mix_into(pad_r, r, at, 0.42)
    for eighth in range(8):
        when = at + eighth * BEAT / 2
        # Bass skips a note now and then so it breathes.
        if eighth not in (3, 7):
            add(bass(ROOTS[chord] + (12 if eighth == 6 else 0)), when, 0.5)
        mix_into(plucks, pluck(ARP[chord][eighth % 4] + (0 if eighth < 4 else 12 * (eighth % 2))), when, 0.16)
        add(hat(open_=eighth == 7), when + (0 if eighth % 2 == 0 else 0.008), 0.3, pan=0.35)
    for beat in range(4):
        add(kick(0.9), at + beat * BEAT, 0.75)
        if beat in (1, 3):
            add(clap(), at + beat * BEAT, 0.5, pan=-0.1)
    at += BAR
    bar_index += 1

# 26–30 s: the call to action. Drums drop out at 28 s and a bright C chord rings out.
add(impact() * 0.6, 28.0, 0.7)
l, r = pad([48, 55, 60, 64, 67, 74], 2.0, brightness=1.0)
mix_into(pad_l, l, 28.0, 0.6)
mix_into(pad_r, r, 28.0, 0.6)
for i, note in enumerate([72, 76, 79, 84, 88]):
    mix_into(plucks, pluck(note, 1.2), 28.0 + i * 0.09, 0.18)

# Whooshes into each scene change after the reveal.
for cut in (4.0, 10.0, 14.0, 18.0, 22.0, 26.0):
    add(whoosh(), cut - 0.33, 0.55)

# Plucks bounce between the speakers; pads and plucks get some room.
pluck_space = space(plucks)
left += space(pad_l) + pluck_space * 0.8
right += space(pad_r) + np.roll(pluck_space, int(0.012 * SR)) * 1.0

# --- Master ----------------------------------------------------------------------------------
stereo = np.stack([left, right], axis=1)
stereo = np.tanh(stereo * 0.9)  # gentle saturation keeps peaks round
t = np.arange(N) / SR
fade = np.minimum(1, t / 0.05) * np.clip((LENGTH - t) / 1.6, 0, 1)
stereo *= fade[:, None]
stereo *= 0.89 / np.max(np.abs(stereo))  # peak at about -1 dBFS

out_path = sys.argv[1] if len(sys.argv) > 1 else "public/music.wav"
with wave.open(out_path, "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes((stereo * 32767).astype(np.int16).tobytes())
print(f"wrote {out_path}: {LENGTH:.0f} s, {SR} Hz stereo")
