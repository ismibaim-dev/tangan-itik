// Small sensory cues for the guided player: a soft beep, a vibration, and keeping the screen on.

let audio: AudioContext | null = null;

/** Browsers only allow audio after a user gesture, so call this from a click handler. */
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    audio = null;
  }
}

export function beep(frequency: number, durationMs = 160) {
  if (!audio || audio.state !== 'running') return;
  const start = audio.currentTime;
  const end = start + durationMs / 1000;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.18, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

export function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

/** Keeps the screen on while the player is open, where supported. Returns a cleanup function. */
export function keepScreenAwake(): () => void {
  let lock: WakeLockSentinel | null = null;
  let released = false;

  const request = () => {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    navigator.wakeLock
      .request('screen')
      .then((sentinel) => {
        if (released) void sentinel.release();
        else lock = sentinel;
      })
      .catch(() => {});
  };
  // The browser drops the lock when the tab is hidden; take it again on return.
  const onVisibility = () => {
    if (document.visibilityState === 'visible') request();
  };

  request();
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    released = true;
    document.removeEventListener('visibilitychange', onVisibility);
    void lock?.release();
  };
}
