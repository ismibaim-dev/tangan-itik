import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { color } from '../theme';

/** The GripWise mark (an arch with a dot). The arch draws itself, then the dot drops in. */
export function LogoMark({ size, delay = 0, tile = true }: { size: number; delay?: number; tile?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tileIn = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 140 } });
  const draw = interpolate(frame, [delay + 6, delay + 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const drop = spring({ frame: frame - delay - 20, fps, config: { damping: 8, stiffness: 180 } });
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ transform: `scale(${tile ? tileIn : 1})` }}>
      {tile && <rect width="64" height="64" rx="16" fill={color.brand700} />}
      <path
        d="M20 44c0-8 5-15 12-15s12 7 12 15"
        fill="none"
        stroke={color.brand200}
        strokeWidth="5"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
      <circle cx="32" cy={26 - (1 - drop) * 30} r={5 * Math.min(1, drop * 1.4)} fill={color.coral400} />
    </svg>
  );
}
