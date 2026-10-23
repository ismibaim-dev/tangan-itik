import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { color } from '../theme';

/** Warm light background with slowly drifting colour washes. */
export function LightBackground() {
  const frame = useCurrentFrame();
  const drift = (speed: number, amount: number, phase = 0) => Math.sin(frame / speed + phase) * amount;
  return (
    <AbsoluteFill style={{ background: color.sand, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          right: -260 + drift(40, 30),
          top: -320 + drift(55, 24, 1),
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color.brand100} 0%, rgb(211 237 230 / 0) 68%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          left: -300 + drift(48, 26, 2),
          bottom: -420 + drift(36, 20),
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color.coral100} 0%, rgb(255 227 215 / 0) 65%)`,
          opacity: 0.8,
        }}
      />
    </AbsoluteFill>
  );
}

/** Deep brand green with concentric rings, echoing the app's welcome screen. */
export function DarkBackground({ tint = color.brand900, ringsAt = { x: 960, y: 540 } }: {
  tint?: string;
  ringsAt?: { x: number; y: number };
}) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: tint, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at ${ringsAt.x}px ${ringsAt.y}px, rgb(43 136 117 / 0.35), rgb(19 57 51 / 0) 55%)`,
        }}
      />
      {[0, 1, 2, 3].map((i) => {
        const size = 520 + i * 300 + Math.sin(frame / 30 + i) * 12;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: ringsAt.x - size / 2,
              top: ringsAt.y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              border: `2px solid rgb(255 255 255 / ${0.09 - i * 0.018})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}
