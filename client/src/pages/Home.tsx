import clsx from 'clsx';
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Flame,
  Play,
  Stethoscope,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useChangePhase, useDashboard } from '../api/hooks';
import type { Dashboard } from '../api/types';
import { painTone } from '../components/PainScale';
import { useToast } from '../components/Toast';
import { Button, Card, ErrorState, ProgressBar, SectionTitle, Spinner } from '../components/ui';
import { formatDay, greeting, parseLocalDate } from '../lib/dates';

export function HomePage() {
  const { data, error, isPending, refetch } = useDashboard();
  if (isPending) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div>
      <header className="flex items-center justify-between px-5 pt-7 pb-5">
        <div>
          <p className="text-sm font-medium text-ink-soft">
            {formatDay(data.today, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">
            {greeting()}, {data.name}
          </h1>
        </div>
        <Link
          to="/profile"
          aria-label="Profile"
          className="grid size-11 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-800"
        >
          {data.name.slice(0, 1).toUpperCase()}
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-5 px-5">
        <TodayCard data={data} />
        <StreakCard data={data} />
        {data.assessmentDue && <WeeklyCheckCard />}
        <PhaseCard data={data} />
        <SymptomCard data={data} />
        <SafetyCard />
      </div>
    </div>
  );
}

function TodayCard({ data }: { data: Dashboard }) {
  const navigate = useNavigate();
  const done = data.todaySessions > 0;
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-700 p-6 text-white shadow-lift">
      <div aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full border-[28px] border-white/5" />
      <div aria-hidden className="absolute -right-4 -bottom-20 size-40 rounded-full bg-brand-600/60" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide uppercase">
            Phase {data.phase.phase} · {data.phase.name}
          </span>
        </div>
        <h2 className="mt-4 text-[22px] leading-snug font-extrabold">
          {done ? 'Routine done for today' : "Today's routine"}
        </h2>
        <p className="mt-1 text-brand-100">
          {done
            ? `${data.todaySessions} ${data.todaySessions === 1 ? 'session' : 'sessions'} completed. A second round later is fine if it feels good.`
            : `${data.routine.exerciseCount} exercises · about ${data.routine.estimatedMinutes} min`}
        </p>
        {data.routine.flareMode && (
          <p className="mt-4 flex gap-2 rounded-2xl bg-coral-500/20 p-3 text-sm text-coral-50 ring-1 ring-coral-200/30">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Your last pain score was high, so today's routine sticks to gentle glides.
          </p>
        )}
        <Button
          variant="light"
          size="lg"
          className="mt-5 w-full sm:w-auto"
          onClick={() => navigate('/session')}
        >
          {done ? <CircleCheck className="size-5 text-brand-600" aria-hidden /> : <Play className="size-5 fill-current" aria-hidden />}
          {done ? 'Do another round' : 'Start session'}
        </Button>
      </div>
    </section>
  );
}

function StreakCard({ data }: { data: Dashboard }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex shrink-0 flex-col items-center">
        <span
          className={clsx(
            'grid size-12 place-items-center rounded-2xl',
            data.streak > 0 ? 'bg-coral-100 text-coral-600' : 'bg-sand-100 text-ink-faint',
          )}
        >
          <Flame className="size-6" aria-hidden />
        </span>
        <span className="mt-1 text-xs font-semibold text-ink-soft">
          <strong className="text-base text-ink">{data.streak}</strong> day{data.streak === 1 ? '' : 's'}
        </span>
      </div>
      <ol className="grid flex-1 grid-cols-7 gap-1" aria-label="Last 7 days">
        {data.week.map((day) => {
          const isToday = day.date === data.today;
          return (
            <li key={day.date} className="flex flex-col items-center gap-1.5">
              <span className={clsx('text-[11px] font-semibold', isToday ? 'text-brand-700' : 'text-ink-faint')}>
                {parseLocalDate(day.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
              </span>
              <span
                className={clsx(
                  'grid size-8 place-items-center rounded-full',
                  day.done ? 'bg-brand-500 text-white' : 'bg-sand-100',
                  isToday && !day.done && 'ring-2 ring-brand-300 ring-offset-1',
                )}
              >
                {day.done && <Check className="size-4" strokeWidth={3} aria-label="Done" />}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function WeeklyCheckCard() {
  return (
    <Link to="/check" className="flex items-center gap-4 rounded-3xl bg-violet-50 p-5 ring-1 ring-violet-100">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
        <ClipboardCheck className="size-6" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="block font-bold">Weekly symptom check</span>
        <span className="block text-sm text-ink-soft">11 quick questions · about 2 minutes</span>
      </span>
      <ChevronRight className="size-5 text-violet-700" aria-hidden />
    </Link>
  );
}

function PhaseCard({ data }: { data: Dashboard }) {
  const { phase } = data;
  const changePhase = useChangePhase();
  const toast = useToast();

  return (
    <Card>
      <SectionTitle
        action={<span className="text-sm font-semibold text-ink-faint">Phase {phase.phase} of 3</span>}
      >
        Your programme
      </SectionTitle>
      <p className="font-semibold text-brand-800">{phase.name}</p>
      <p className="mt-0.5 text-sm text-ink-soft">{phase.focus}</p>

      {phase.next ? (
        <>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="font-medium text-ink-soft">Sessions this phase</span>
            <span className="font-bold tabular-nums">
              {Math.min(phase.sessionsInPhase, phase.sessionsRequired)}/{phase.sessionsRequired}
            </span>
          </div>
          <ProgressBar value={phase.sessionsInPhase} max={phase.sessionsRequired} className="mt-2" />
          <ul className="mt-4 grid gap-2">
            {phase.criteria.map((c) => (
              <li key={c.key} className="flex items-start gap-2.5 text-sm">
                <span
                  className={clsx(
                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                    c.met ? 'bg-brand-500 text-white' : 'bg-sand-200 text-transparent',
                  )}
                >
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
                <span className={c.met ? 'text-ink' : 'text-ink-soft'}>
                  {c.label}
                  <span className="sr-only">{c.met ? ' (done)' : ' (not yet)'}</span>
                </span>
              </li>
            ))}
          </ul>
          {phase.eligible && (
            <Button
              block
              className="mt-5"
              loading={changePhase.isPending}
              onClick={() =>
                changePhase.mutate(phase.next!.phase, {
                  onSuccess: () => toast(`Welcome to Phase ${phase.next!.phase}`),
                })
              }
            >
              Move to Phase {phase.next.phase}: {phase.next.name}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </>
      ) : (
        <p className="mt-4 rounded-2xl bg-brand-50 p-3 text-sm text-brand-800">
          You've reached the final phase. Keep up the routine to hold on to your gains.
        </p>
      )}
    </Card>
  );
}

function SymptomCard({ data }: { data: Dashboard }) {
  const latest = data.latestSymptom;
  return (
    <Card>
      <SectionTitle
        action={
          <Link to="/log" className="text-sm font-semibold text-brand-700">
            Log now
          </Link>
        }
      >
        How you're feeling
      </SectionTitle>
      {latest ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['Pain', latest.pain],
                ['Numbness', latest.numbness],
                ['Tingling', latest.tingling],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-sand-50 p-3 ring-1 ring-sand-200">
                <p className="text-xs font-semibold text-ink-soft">{label}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums">
                  {value}
                  <span className="text-sm font-semibold text-ink-faint">/10</span>
                </p>
                <span className={clsx('mt-2 block h-1.5 rounded-full', painTone(value).dot)} style={{ width: `${Math.max(8, value * 10)}%` }} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Last logged {latest.localDate === data.today ? 'today' : formatDay(latest.localDate)}
            {data.lastAssessment && ` · Weekly check: ${data.lastAssessment.band.toLowerCase()} (${data.lastAssessment.score.toFixed(1)})`}
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-soft">
          A quick daily log of pain, numbness and tingling shows you whether the routine is helping.
        </p>
      )}
    </Card>
  );
}

function SafetyCard() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-3xl bg-sand-50 p-5 ring-1 ring-sand-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <Stethoscope className="size-5 shrink-0 text-coral-600" aria-hidden />
        <span className="flex-1 font-semibold">When to see a clinician</span>
        <ChevronRight className={clsx('size-5 text-ink-faint transition', open && 'rotate-90')} aria-hidden />
      </button>
      {open && (
        <ul className="mt-3 list-disc space-y-1.5 pl-9 text-sm text-ink-soft">
          <li>Numbness that doesn't go away, or is spreading</li>
          <li>Weakness, clumsiness or often dropping things</li>
          <li>The muscle at the base of your thumb looks flatter or thinner</li>
          <li>Symptoms that started after an injury, or that wake you every night despite the routine</li>
        </ul>
      )}
    </section>
  );
}
