// Scene 8: where to get it.
import { Download, ShieldCheck, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { DarkBackground } from '../components/Background';
import { LogoMark } from '../components/LogoMark';
import { FadeUp, Pop, useEnter, useFloat, Words } from '../components/motion';
import { Phone } from '../components/Phone';
import { color } from '../theme';

function Pill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 24px',
        borderRadius: 999,
        background: 'rgb(255 255 255 / 0.12)',
        color: color.white,
        fontSize: 28,
        fontWeight: 700,
      }}
    >
      <span style={{ color: color.brand200, display: 'flex' }}>{icon}</span>
      {label}
    </div>
  );
}

export function CallToAction() {
  const phoneIn = useEnter(8, { damping: 16, stiffness: 90 });
  const float = useFloat(0, 8);
  return (
    <AbsoluteFill>
      <DarkBackground tint={color.brand800} ringsAt={{ x: 1480, y: 540 }} />
      <div style={{ position: 'absolute', left: 150, top: 0, bottom: 0, width: 980, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <LogoMark size={140} delay={2} />
          <Words text="GripWise" delay={10} stagger={0} size={128} tint={color.white} />
        </div>
        <FadeUp delay={20} style={{ marginTop: 18 }}>
          <div style={{ fontSize: 44, fontWeight: 600, color: color.brand100 }}>Gentle, guided rehab for carpal tunnel</div>
        </FadeUp>
        <FadeUp delay={30} style={{ display: 'flex', gap: 16, marginTop: 40 }}>
          <Pill icon={<Smartphone size={30} />} label="Free for Android" />
          <Pill icon={<ShieldCheck size={30} />} label="No account needed" />
        </FadeUp>
        <Pop delay={42} style={{ marginTop: 44, transformOrigin: 'left center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 22,
              padding: '22px 34px 22px 22px',
              borderRadius: 30,
              background: color.white,
              boxShadow: '0 24px 60px rgb(0 0 0 / 0.25)',
            }}
          >
            <div style={{ display: 'grid', placeItems: 'center', width: 76, height: 76, borderRadius: 22, background: color.coral, color: color.white }}>
              <Download size={40} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: color.inkSoft }}>Download the APK</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: color.ink, letterSpacing: '-0.01em' }}>github.com/ismibaim-dev/tangan-itik</div>
            </div>
          </div>
        </Pop>
        <FadeUp delay={58} style={{ marginTop: 46 }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: 'rgb(211 237 230 / 0.75)' }}>
            GripWise supports, but does not replace, care from your doctor or hand therapist.
          </div>
        </FadeUp>
      </div>
      <Phone
        screen="home"
        width={380}
        style={{
          left: 1340,
          top: 110 + (1 - phoneIn) * 700 + float,
          transform: `rotate(${4 + (1 - phoneIn) * 8}deg)`,
          opacity: Math.min(1, phoneIn * 2),
        }}
      />
    </AbsoluteFill>
  );
}
