// Scenes 4–7: what the app does, each with real GripWise screens.
import { Check, Clock, FileSpreadsheet, Flame, Hand, HeartPulse, ShieldCheck, Timer, TrendingDown, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { LightBackground } from '../components/Background';
import { Chip, Counter, Eyebrow, FadeUp, Pop, useEnter, useFloat, Words } from '../components/motion';
import { Phone } from '../components/Phone';
import { color } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function FeatureLayout({ text, visual }: { text: ReactNode; visual: ReactNode }) {
  return (
    <AbsoluteFill>
      <LightBackground />
      <div style={{ position: 'absolute', left: 150, top: 0, bottom: 0, width: 860, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {text}
      </div>
      {visual}
    </AbsoluteFill>
  );
}

/** A phone that springs up into place with a small tilt. */
function RisingPhone({
  screen,
  x,
  y,
  delay,
  tilt = 0,
  width = 400,
  zoom,
}: {
  screen: string;
  x: number;
  y: number;
  delay: number;
  tilt?: number;
  width?: number;
  zoom?: { scale: number; originY: number };
}) {
  const p = useEnter(delay, { damping: 16, stiffness: 90 });
  const float = useFloat(delay, 6);
  return (
    <Phone
      screen={screen}
      width={width}
      zoom={zoom}
      style={{
        left: x,
        top: y + (1 - p) * 700 + float,
        transform: `rotate(${tilt + (1 - p) * 8}deg)`,
        opacity: Math.min(1, p * 2),
      }}
    />
  );
}

const featureChips = (items: { icon: ReactNode; label: string; tile?: string; iconColor?: string }[], from: number) =>
  items.map((item, i) => (
    <FadeUp key={item.label} delay={from + i * 8} distance={30} style={{ marginTop: 18 }}>
      <Chip icon={item.icon} label={item.label} tile={item.tile} iconColor={item.iconColor} size={28} />
    </FadeUp>
  ));

// ---------------------------------------------------------------------------

/** A countdown ring like the app's session timer, ticking down a 5 second hold. */
function HoldRing({ x, y, delay }: { x: number; y: number; delay: number }) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [delay + 10, delay + 10 + 5 * 30], [0, 1], clamp);
  const seconds = Math.max(1, Math.ceil(5 * (1 - t)));
  const c = 2 * Math.PI * 80;
  return (
    <div style={{ position: 'absolute', left: x, top: y }}>
      <Pop delay={delay}>
        <div style={{ position: 'relative', width: 220, height: 220, borderRadius: '50%', background: color.white, boxShadow: '0 20px 50px rgb(21 48 45 / 0.18)' }}>
          <svg width={220} height={220} viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="110" cy="110" r="80" fill="none" stroke={color.sand200} strokeWidth="16" />
            <circle cx="110" cy="110" r="80" fill="none" stroke={color.coral} strokeWidth="16" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - t)} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 76, fontWeight: 800, color: color.ink, lineHeight: 1 }}>{seconds}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.12em', color: color.inkSoft }}>HOLD</div>
          </div>
        </div>
      </Pop>
    </div>
  );
}

export function Guided() {
  return (
    <FeatureLayout
      text={
        <>
          <Eyebrow text="GUIDED SESSIONS" delay={8} />
          <Words text="A timer that paces" delay={10} size={84} />
          <Words text="every hold" delay={18} size={84} accent={['every', 'hold']} />
          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {featureChips(
              [
                { icon: <Timer size={30} />, label: 'Paced holds, relaxes and rests' },
                { icon: <Volume2 size={30} />, label: 'Sound and vibration cues', tile: '#e0f2fe', iconColor: '#0369a1' },
                { icon: <Clock size={30} />, label: 'About 10 minutes a day', tile: color.coral100, iconColor: color.coral },
              ],
              36,
            )}
          </div>
        </>
      }
      visual={
        <>
          <RisingPhone screen="player" x={1190} y={100} delay={4} tilt={-2} />
          <HoldRing x={1540} y={640} delay={30} />
        </>
      }
    />
  );
}

// ---------------------------------------------------------------------------

/** The app's 0–10 pain scale, with the selection sliding up to 8. */
function PainSlide({ delay }: { delay: number }) {
  const frame = useCurrentFrame();
  const selected = Math.round(interpolate(frame, [delay + 8, delay + 28], [2, 8], clamp));
  const p = useEnter(delay);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 30}px)`, marginTop: 36 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color.inkSoft, marginBottom: 14 }}>
        Pain right now: <span style={{ color: selected >= 7 ? color.coral : color.brand700, fontWeight: 800 }}>{selected}/10</span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {Array.from({ length: 11 }, (_, n) => {
          const on = n === selected;
          const bg = n <= 3 ? color.brand600 : n <= 6 ? '#fbbf24' : color.coral;
          return (
            <div
              key={n}
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                display: 'grid',
                placeItems: 'center',
                fontSize: 24,
                fontWeight: 800,
                background: on ? bg : color.white,
                color: on ? color.white : color.inkSoft,
                transform: `scale(${on ? 1.15 : 1})`,
                boxShadow: on ? '0 10px 24px rgb(233 100 59 / 0.35)' : '0 2px 6px rgb(21 48 45 / 0.06)',
              }}
            >
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Phase 1 → 2 → 3, filling in one step at a time. */
function PhasePath({ delay }: { delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phases = ['Calm & glide', 'Restore flexibility', 'Rebuild strength'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 34 }}>
      {phases.map((name, i) => {
        const p = spring({ frame: frame - delay - i * 10, fps, config: { damping: 14, stiffness: 140 } });
        const done = frame > delay + i * 10 + 6;
        return (
          <div key={name} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <div style={{ width: 46, height: 6, borderRadius: 3, background: color.sand200, overflow: 'hidden' }}>
                <div style={{ width: `${p * 100}%`, height: '100%', background: color.brand500 }} />
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 18px',
                borderRadius: 20,
                background: done ? color.brand700 : color.white,
                color: done ? color.white : color.inkSoft,
                fontSize: 22,
                fontWeight: 700,
                transform: `scale(${0.85 + p * 0.15})`,
                opacity: 0.4 + p * 0.6,
                boxShadow: '0 6px 18px rgb(21 48 45 / 0.1)',
              }}
            >
              {done ? <Check size={22} strokeWidth={3} /> : <span style={{ fontWeight: 800 }}>{i + 1}</span>}
              {name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Adapts() {
  return (
    <FeatureLayout
      text={
        <>
          <Eyebrow text="ADAPTS TO YOU" delay={8} />
          <Words text="High-pain day?" delay={10} size={84} />
          <Words text="It eases off." delay={18} size={84} accent={['eases', 'off.']} />
          <PainSlide delay={26} />
          <FadeUp delay={54} style={{ marginTop: 22 }}>
            <Chip icon={<HeartPulse size={30} />} label="Switches to a gentle, glides-only routine" tile={color.coral100} iconColor={color.coral} size={26} />
          </FadeUp>
          <PhasePath delay={68} />
        </>
      }
      visual={
        <>
          <RisingPhone screen="checkin-high-pain" x={1110} y={150} delay={2} tilt={-7} width={360} />
          <RisingPhone screen="flare-overview" x={1400} y={90} delay={14} tilt={4} width={390} />
        </>
      }
    />
  );
}

// ---------------------------------------------------------------------------

/** Pain over four weeks, drawing itself from left to right. */
function TrendCard({ x, y, delay }: { x: number; y: number; delay: number }) {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [delay + 6, delay + 46], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 2) });
  const points = [6, 6, 5.5, 6, 5, 5, 4.5, 4, 4.5, 4, 3.5, 3, 3.5, 3, 2.5, 2.5, 2];
  const w = 420;
  const h = 150;
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (points.length - 1)) * w},${h - (v / 7) * h}`).join(' ');
  const float = useFloat(1, 8);
  return (
    <div style={{ position: 'absolute', left: x, top: y + float }}>
      <Pop delay={delay}>
        <div style={{ padding: '24px 28px', borderRadius: 30, background: color.white, boxShadow: '0 24px 60px rgb(21 48 45 / 0.18)' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: color.ink }}>Pain, last 4 weeks</div>
          <svg width={w} height={h + 20} viewBox={`-6 -10 ${w + 12} ${h + 20}`} style={{ marginTop: 10 }}>
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke={color.sand200} strokeWidth={2} />
            ))}
            <path d={path} fill="none" stroke={color.chart} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            <circle cx={w} cy={h - (2 / 7) * h} r={9 * draw} fill={color.chart} stroke={color.white} strokeWidth={3} />
          </svg>
        </div>
      </Pop>
    </div>
  );
}

function Stat({ icon, label, value, unit, delay, tint }: { icon: ReactNode; label: string; value: ReactNode; unit: string; delay: number; tint: string }) {
  return (
    <FadeUp delay={delay} distance={30}>
      <div style={{ width: 230, padding: '22px 24px', borderRadius: 28, background: color.white, boxShadow: '0 14px 36px rgb(21 48 45 / 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 700, color: color.inkSoft }}>
          <span style={{ color: tint, display: 'flex' }}>{icon}</span>
          {label}
        </div>
        <div style={{ marginTop: 8, fontSize: 62, fontWeight: 800, color: color.ink, letterSpacing: '-0.03em' }}>
          {value}
          <span style={{ fontSize: 26, fontWeight: 700, color: color.inkSoft, marginLeft: 6 }}>{unit}</span>
        </div>
      </div>
    </FadeUp>
  );
}

export function Progress() {
  return (
    <FeatureLayout
      text={
        <>
          <Eyebrow text="TRACK YOUR PROGRESS" delay={8} />
          <Words text="Watch your symptoms" delay={10} size={76} />
          <Words text="ease week by week" delay={18} size={76} accent={['ease']} />
          <div style={{ display: 'flex', gap: 22, marginTop: 44 }}>
            <Stat icon={<TrendingDown size={26} />} label="Pain" value={<Counter from={6} to={2} start={40} end={90} />} unit="/10" delay={34} tint={color.chart} />
            <Stat icon={<Flame size={26} />} label="Streak" value={<Counter from={0} to={14} start={46} end={96} />} unit="days" delay={42} tint={color.coral} />
            <Stat icon={<Hand size={26} />} label="Grip" value={<Counter from={14} to={19.2} start={52} end={102} decimals={1} />} unit="kg" delay={50} tint="#6d28d9" />
          </div>
        </>
      }
      visual={
        <>
          <RisingPhone screen="progress-symptoms" x={1330} y={100} delay={4} tilt={2} />
          <TrendCard x={1000} y={620} delay={40} />
        </>
      }
    />
  );
}

// ---------------------------------------------------------------------------

const CSV_FILES = ['profile.csv', 'sessions.csv', 'session-exercises.csv', 'symptom-logs.csv', 'weekly-checks.csv'];

/** CSV files fly out of the phone's export button into a neat stack. */
function FlyingFiles({ from, delay }: { from: { x: number; y: number }; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {CSV_FILES.map((name, i) => {
        const p = spring({ frame: frame - delay - i * 6, fps, config: { damping: 15, stiffness: 110 } });
        const to = { x: 1500, y: 230 + i * 120 };
        const x = interpolate(p, [0, 1], [from.x, to.x]);
        // Rise in an arc on the way out.
        const y = interpolate(p, [0, 1], [from.y, to.y]) - Math.sin(p * Math.PI) * 120;
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              opacity: Math.min(1, p * 3),
              transform: `scale(${0.4 + p * 0.6}) rotate(${(1 - p) * -20}deg)`,
            }}
          >
            <Chip icon={<FileSpreadsheet size={28} />} label={name} size={24} style={{ padding: '12px 22px 12px 12px', borderRadius: 22 }} />
          </div>
        );
      })}
    </>
  );
}

export function Private() {
  return (
    <FeatureLayout
      text={
        <>
          <Eyebrow text="PRIVATE BY DESIGN" delay={8} />
          <Words text="No account." delay={10} size={96} />
          <Words text="No cloud." delay={16} size={96} accent={['cloud.']} />
          <FadeUp delay={28} style={{ marginTop: 26 }}>
            <div style={{ fontSize: 36, fontWeight: 600, color: color.inkSoft, lineHeight: 1.35, maxWidth: 640 }}>
              Everything stays on your phone. Export it all to CSV, anytime.
            </div>
          </FadeUp>
          <FadeUp delay={40} style={{ marginTop: 30 }}>
            <Chip icon={<ShieldCheck size={30} />} label="Works offline. Nothing leaves your phone." size={26} />
          </FadeUp>
        </>
      }
      visual={
        <>
          <RisingPhone screen="profile-data" x={1060} y={100} delay={4} tilt={-2} />
          <FlyingFiles from={{ x: 1150, y: 350 }} delay={44} />
        </>
      }
    />
  );
}
