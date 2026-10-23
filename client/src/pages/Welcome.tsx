import { ChartLine, Flame, Hand, Waves } from 'lucide-react';
import { Link } from 'react-router';
import { Frame } from '../components/AppShell';

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-brand-800'}`}>
      <img src="/favicon.svg" alt="" className="size-8" />
      GripWise
    </span>
  );
}

export function WelcomePage() {
  return (
    <Frame background="bg-brand-800" className="flex flex-col">
      <div className="relative flex-1 overflow-hidden px-6 pt-8">
        <Logo light />
        {/* Hero: a calm hand at the centre of concentric rings, with a few things the app tracks. */}
        <div className="relative mx-auto mt-10 grid aspect-square w-full max-w-[320px] place-items-center" aria-hidden>
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-8 rounded-full border border-white/15" />
          <div className="absolute inset-16 rounded-full bg-brand-700" />
          <div className="relative grid size-32 place-items-center rounded-full bg-brand-200 text-brand-800 shadow-lift">
            <Hand className="size-16" strokeWidth={1.6} />
          </div>
          <span className="absolute top-6 -left-1 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-ink shadow-lift">
            <span className="grid size-6 place-items-center rounded-lg bg-violet-100 text-violet-700">
              <Waves className="size-3.5" />
            </span>
            Nerve glides
          </span>
          <span className="absolute top-1/2 -right-2 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-ink shadow-lift">
            <span className="grid size-6 place-items-center rounded-lg bg-brand-100 text-brand-700">
              <ChartLine className="size-3.5" />
            </span>
            Pain 6 → 2
          </span>
          <span className="absolute bottom-4 left-6 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-ink shadow-lift">
            <span className="grid size-6 place-items-center rounded-lg bg-coral-100 text-coral-600">
              <Flame className="size-3.5" />
            </span>
            12-day streak
          </span>
        </div>
      </div>

      <div className="rounded-t-[2rem] bg-sand-50 px-6 pt-8 pb-8">
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-balance">
          Gentle, guided rehab for carpal tunnel
        </h1>
        <p className="mt-3 text-ink-soft">
          Daily nerve and tendon glides, a timer that paces every hold, and a simple log that shows how your hand is
          really doing.
        </p>
        <div className="mt-7 grid gap-3">
          <Link
            to="/register"
            className="flex h-14 items-center justify-center rounded-2xl bg-brand-700 font-semibold text-white hover:bg-brand-800"
          >
            Get started
          </Link>
          <Link
            to="/login"
            className="flex h-14 items-center justify-center rounded-2xl font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
          >
            I already have an account
          </Link>
        </div>
        <p className="mt-6 text-center text-xs text-ink-faint">
          GripWise supports, but does not replace, care from your doctor or hand therapist.
        </p>
      </div>
    </Frame>
  );
}
