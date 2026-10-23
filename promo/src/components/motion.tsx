// Small animation building blocks shared by every scene.
import type { CSSProperties, ReactNode } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { color } from '../theme';

/** 0 → 1 spring that starts at `delay` frames. */
export function useEnter(delay: number, config: { damping?: number; mass?: number; stiffness?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120, ...config } });
}

/** Rises and fades in. */
export function FadeUp({
  delay,
  distance = 40,
  children,
  style,
}: {
  delay: number;
  distance?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const p = useEnter(delay);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * distance}px)`, ...style }}>{children}</div>
  );
}

/** Pops in with a slight overshoot. */
export function Pop({ delay, children, style }: { delay: number; children: ReactNode; style?: CSSProperties }) {
  const p = useEnter(delay, { damping: 11, stiffness: 160 });
  return <div style={{ opacity: Math.min(1, p * 1.5), transform: `scale(${0.6 + p * 0.4})`, ...style }}>{children}</div>;
}

/**
 * Kinetic headline: each word rises out of its own mask, one after another.
 * Words in `accent` are coloured.
 */
export function Words({
  text,
  delay,
  stagger = 3,
  size,
  weight = 800,
  tint = color.ink,
  accent = [],
  accentColor = color.coral,
  lineHeight = 1.08,
}: {
  text: string;
  delay: number;
  stagger?: number;
  size: number;
  weight?: number;
  tint?: string;
  accent?: string[];
  accentColor?: string;
  lineHeight?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ fontSize: size, fontWeight: weight, lineHeight, letterSpacing: '-0.03em', color: tint }}>
      {text.split(' ').map((word, i) => {
        const p = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 20, stiffness: 140 } });
        return (
          <span
            key={i}
            style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.08em' }}
          >
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - p) * 110}%)`,
                color: accent.includes(word) ? accentColor : undefined,
              }}
            >
              {word}
              {' '}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** A short coral label above a headline, with a line that draws in. */
export function Eyebrow({ text, delay, tint = color.coral }: { text: string; delay: number; tint?: string }) {
  const p = useEnter(delay);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: p, marginBottom: 28 }}>
      <div style={{ width: 56 * p, height: 4, borderRadius: 2, background: tint }} />
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.18em', color: tint }}>{text}</div>
    </div>
  );
}

/** A white card with an icon, as used throughout the app. */
export function Chip({
  icon,
  label,
  tile = color.brand50,
  iconColor = color.brand700,
  size = 30,
  style,
}: {
  icon: ReactNode;
  label: ReactNode;
  tile?: string;
  iconColor?: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 18,
        padding: '16px 28px 16px 16px',
        borderRadius: 26,
        background: color.white,
        boxShadow: '0 2px 4px rgb(21 48 45 / 0.06), 0 16px 40px rgb(21 48 45 / 0.12)',
        fontSize: size,
        fontWeight: 700,
        color: color.ink,
        ...style,
      }}
    >
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          width: size * 1.9,
          height: size * 1.9,
          borderRadius: 18,
          background: tile,
          color: iconColor,
        }}
      >
        {icon}
      </div>
      {label}
    </div>
  );
}

/** Counts from `from` to `to` between two frames. */
export function Counter({
  from,
  to,
  start,
  end,
  decimals = 0,
}: {
  from: number;
  to: number;
  start: number;
  end: number;
  decimals?: number;
}) {
  const frame = useCurrentFrame();
  const value = interpolate(frame, [start, end], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  return <>{value.toFixed(decimals)}</>;
}

/** Gentle up-and-down drift for floating elements. */
export function useFloat(phase = 0, amount = 10) {
  const frame = useCurrentFrame();
  return Math.sin(frame / 18 + phase) * amount;
}
