// Scenes 1–3: the problem, then the GripWise reveal.
import { Flame, Keyboard, Moon, TrendingDown, Waves } from 'lucide-react';
import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { DarkBackground } from '../components/Background';
import { LogoMark } from '../components/LogoMark';
import { Chip, FadeUp, Pop, useEnter, useFloat, Words } from '../components/motion';
import { color } from '../theme';

/** A soft ring that keeps pulsing outwards, like a nerve signal. */
function Pulse({ x, y, every = 30 }: { x: number; y: number; every?: number }) {
  const frame = useCurrentFrame();
  return (
    <>
      {[0, 1].map((i) => {
        const t = ((frame + i * (every / 2)) % every) / every;
        const size = 140 + t * 520;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              border: `3px solid ${color.coral400}`,
              opacity: (1 - t) * 0.35,
            }}
          />
        );
      })}
    </>
  );
}

function Question({ icon, lines, accent, delay }: { icon: ReactNode; lines: [string, string]; accent: string[]; delay: number }) {
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Pop delay={delay} style={{ marginBottom: 40 }}>
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 120,
            height: 120,
            borderRadius: 36,
            background: 'rgb(255 255 255 / 0.1)',
            color: color.coral400,
          }}
        >
          {icon}
        </div>
      </Pop>
      <Words text={lines[0]} delay={delay + 4} size={128} tint={color.white} accent={accent} accentColor={color.coral400} />
      <Words text={lines[1]} delay={delay + 12} size={128} tint={color.white} accent={accent} accentColor={color.coral400} />
    </AbsoluteFill>
  );
}

export function Hook() {
  const frame = useCurrentFrame();
  // The first question lifts away as the second arrives.
  const out = interpolate(frame, [52, 62], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <DarkBackground ringsAt={{ x: 960, y: 300 }} />
      <Pulse x={960} y={300} />
      <AbsoluteFill style={{ opacity: 1 - out, transform: `translateY(${-out * 60}px)` }}>
        <Question icon={<Moon size={60} />} lines={['Numb fingers', 'at 3 AM?']} accent={['3', 'AM?']} delay={2} />
      </AbsoluteFill>
      {frame >= 58 && (
        <Question
          icon={<Keyboard size={60} />}
          lines={['Tingling every', 'time you type?']}
          accent={['type?']}
          delay={60}
        />
      )}
    </AbsoluteFill>
  );
}

export function Problem() {
  // Words start once the fade from the hook has finished.
  const underline = useEnter(34, { damping: 30 });
  return (
    <AbsoluteFill>
      <DarkBackground tint={color.brand950} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Words text="Hand exercises help." delay={10} size={100} tint={color.white} />
        <div style={{ position: 'relative', marginTop: 12 }}>
          <Words text="If you actually do them." delay={20} size={100} tint={color.brand200} />
          <div
            style={{
              position: 'absolute',
              right: 40,
              bottom: 2,
              height: 12,
              width: 420 * underline,
              borderRadius: 6,
              background: color.coral,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Floating({ children, x, y, delay, phase }: { children: ReactNode; x: number; y: number; delay: number; phase: number }) {
  const float = useFloat(phase, 12);
  return (
    <div style={{ position: 'absolute', left: x, top: y + float }}>
      <Pop delay={delay}>{children}</Pop>
    </div>
  );
}

export function Reveal() {
  return (
    <AbsoluteFill>
      <DarkBackground tint={color.brand700} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <LogoMark size={190} delay={4} />
        <div style={{ height: 36 }} />
        <Words text="GripWise" delay={26} stagger={0} size={150} tint={color.white} />
        <FadeUp delay={40}>
          <div style={{ fontSize: 46, fontWeight: 600, color: color.brand100, marginTop: 12 }}>
            Gentle, guided rehab for carpal tunnel
          </div>
        </FadeUp>
      </AbsoluteFill>
      <Floating x={250} y={250} delay={56} phase={0}>
        <Chip icon={<Waves size={34} />} label="Nerve glides" tile="#ede9fe" iconColor="#6d28d9" />
      </Floating>
      <Floating x={1420} y={380} delay={64} phase={2}>
        <Chip icon={<TrendingDown size={34} />} label="Pain 6 → 2" />
      </Floating>
      <Floating x={300} y={870} delay={72} phase={4}>
        <Chip icon={<Flame size={34} />} label="14-day streak" tile={color.coral100} iconColor={color.coral} />
      </Floating>
    </AbsoluteFill>
  );
}
