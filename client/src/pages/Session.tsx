import clsx from 'clsx';
import {
  ArrowRight,
  CircleCheck,
  Clock,
  Pause,
  Play,
  SkipForward,
  TrendingDown,
  TriangleAlert,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useRoutine, useSaveSession } from '../data/hooks';
import type { Exercise, SessionExerciseInput, SessionResult } from '../data/types';
import { Frame } from '../components/AppShell';
import { PainScale } from '../components/PainScale';
import { Button, ErrorState, FormError, ProgressBar, Spinner, Textarea } from '../components/ui';
import { formatDuration } from '../lib/dates';
import { categoryMeta, doseLabel } from '../lib/exercise-meta';
import { beep, keepScreenAwake, unlockAudio, vibrate } from '../lib/cues';

type Stage = 'check-in' | 'overview' | 'active' | 'check-out' | 'summary';

export function SessionPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('check-in');
  const [painBefore, setPainBefore] = useState<number | null>(null);
  const [painAfter, setPainAfter] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [startedAt, setStartedAt] = useState<number>(0);
  const [finishedAt, setFinishedAt] = useState<number>(0);
  const [results, setResults] = useState<SessionExerciseInput[]>([]);
  const [outcome, setOutcome] = useState<SessionResult | null>(null);

  const routine = useRoutine(stage === 'check-in' ? null : painBefore);
  const save = useSaveSession();

  function saveSession() {
    if (painBefore === null || painAfter === null || !routine.data) return;
    save.mutate(
      {
        startedAt: new Date(startedAt).toISOString(),
        durationSeconds: Math.round((finishedAt - startedAt) / 1000),
        painBefore,
        painAfter,
        flareMode: routine.data.flareMode,
        notes: notes.trim() || undefined,
        exercises: results,
      },
      {
        onSuccess: (result) => {
          setOutcome(result);
          setStage('summary');
        },
      },
    );
  }

  if (stage === 'check-in') {
    return (
      <StageLayout
        onClose={() => navigate('/')}
        title="How does your hand feel right now?"
        subtitle="We'll adjust today's routine if your pain is high."
        footer={
          <Button size="lg" block disabled={painBefore === null} onClick={() => setStage('overview')}>
            Continue
          </Button>
        }
      >
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <PainScale label="Pain" value={painBefore} onChange={setPainBefore} highLabel="Worst imaginable" />
        </div>
      </StageLayout>
    );
  }

  if (stage === 'overview') {
    return (
      <StageLayout
        onClose={() => navigate('/')}
        title="Today's session"
        subtitle={
          routine.data
            ? `${routine.data.exercises.length} exercises · about ${routine.data.estimatedMinutes} min`
            : undefined
        }
        footer={
          routine.data && (
            <Button
              size="lg"
              block
              onClick={() => {
                unlockAudio();
                setStartedAt(Date.now());
                setStage('active');
              }}
            >
              <Play className="size-5 fill-current" aria-hidden /> Start
            </Button>
          )
        }
      >
        {routine.isPending && <Spinner />}
        {routine.error && <ErrorState error={routine.error} onRetry={() => routine.refetch()} />}
        {routine.data && (
          <>
            {routine.data.flareMode && (
              <p className="mb-4 flex gap-3 rounded-2xl bg-coral-50 p-4 text-sm text-coral-700 ring-1 ring-coral-100">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                Your pain is high, so today is a gentle routine: glides only, no stretching or strengthening. If pain is
                severe or keeps rising, rest and contact your clinician.
              </p>
            )}
            <ol className="grid grid-cols-1 gap-3">
              {routine.data.exercises.map((ex, i) => (
                <li key={ex.id} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card">
                  <span className={clsx('grid size-11 shrink-0 place-items-center rounded-2xl', categoryMeta[ex.category].tile)}>
                    {categoryMeta[ex.category].icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink-faint">Exercise {i + 1}</span>
                    <span className="block font-bold">{ex.name}</span>
                    <span className="block text-sm text-ink-soft">{doseLabel(ex)}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-center text-sm text-ink-faint">
              Move slowly and stay within a comfortable range. A gentle pull is fine; sharp pain is not.
            </p>
          </>
        )}
      </StageLayout>
    );
  }

  if (stage === 'active' && routine.data) {
    return (
      <Player
        exercises={routine.data.exercises}
        onFinish={(finalResults) => {
          setResults(finalResults);
          setFinishedAt(Date.now());
          setStage('check-out');
        }}
        onDiscard={() => navigate('/')}
      />
    );
  }

  if (stage === 'check-out') {
    const completed = results.filter((r) => !r.skipped).length;
    return (
      <StageLayout
        title="Nice work. How does your hand feel now?"
        subtitle={`${completed} of ${results.length} exercises done in ${formatDuration((finishedAt - startedAt) / 1000)}.`}
        footer={
          <>
            <FormError error={save.error} />
            <Button size="lg" block disabled={painAfter === null} loading={save.isPending} onClick={saveSession}>
              Save session
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-3xl bg-white p-5 shadow-card">
            <PainScale label="Pain" value={painAfter} onChange={setPainAfter} highLabel="Worst imaginable" />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Notes (optional)</span>
            <Textarea
              value={notes}
              maxLength={1000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything that felt tight, easier, or different?"
            />
          </label>
        </div>
      </StageLayout>
    );
  }

  if (stage === 'summary' && outcome) return <Summary outcome={outcome} />;
  return null;
}

function StageLayout({
  title,
  subtitle,
  children,
  footer,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
}) {
  return (
    <Frame className="flex flex-col">
      <div className="flex justify-end px-5 pt-6">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full bg-white shadow-card"
          >
            <X className="size-5" />
          </button>
        )}
      </div>
      <div className="flex-1 px-5 pt-4">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-balance">{title}</h1>
        {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
        <div className="mt-6 pb-6">{children}</div>
      </div>
      {footer && <div className="pb-safe sticky bottom-0 grid gap-3 bg-gradient-to-t from-sand-100 via-sand-100 px-5 pt-6">{footer}</div>}
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Guided player

const READY_SECONDS = 6;
const RELAX_SECONDS = 3;

interface Step {
  kind: 'ready' | 'work' | 'relax' | 'rest';
  seconds: number;
  set: number;
  rep: number;
}

function buildSteps(ex: Exercise): Step[] {
  const steps: Step[] = [{ kind: 'ready', seconds: READY_SECONDS, set: 1, rep: 1 }];
  for (let set = 1; set <= ex.sets; set++) {
    for (let rep = 1; rep <= ex.reps; rep++) {
      steps.push({ kind: 'work', seconds: ex.holdSeconds, set, rep });
      if (rep < ex.reps) steps.push({ kind: 'relax', seconds: RELAX_SECONDS, set, rep });
    }
    if (set < ex.sets) steps.push({ kind: 'rest', seconds: ex.restSeconds, set, rep: ex.reps });
  }
  return steps;
}

interface PlayerState {
  exercises: Exercise[];
  plans: Step[][];
  exIndex: number;
  stepIndex: number;
  endsAt: number;
  /** Milliseconds left on the current step while paused; null while running. */
  pausedRemaining: number | null;
  results: SessionExerciseInput[];
  done: boolean;
}

type PlayerAction =
  | { type: 'advance'; now: number }
  | { type: 'skip'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'end' };

function startExercise(state: PlayerState, exIndex: number, now: number): PlayerState {
  const plan = state.plans[exIndex];
  if (!plan) return { ...state, done: true };
  return { ...state, exIndex, stepIndex: 0, endsAt: now + plan[0]!.seconds * 1000, pausedRemaining: null };
}

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  if (state.done) return state;
  switch (action.type) {
    case 'advance': {
      const plan = state.plans[state.exIndex]!;
      const step = plan[state.stepIndex]!;
      const exercise = state.exercises[state.exIndex]!;
      let results = state.results;
      if (step.kind === 'work') {
        results = results.map((r, i) =>
          i === state.exIndex
            ? {
                ...r,
                skipped: false,
                repsCompleted: r.repsCompleted + 1,
                setsCompleted: step.rep === exercise.reps ? r.setsCompleted + 1 : r.setsCompleted,
              }
            : r,
        );
      }
      const next = plan[state.stepIndex + 1];
      if (next) return { ...state, results, stepIndex: state.stepIndex + 1, endsAt: action.now + next.seconds * 1000 };
      return startExercise({ ...state, results }, state.exIndex + 1, action.now);
    }
    case 'skip':
      return startExercise(state, state.exIndex + 1, action.now);
    case 'pause':
      return state.pausedRemaining !== null ? state : { ...state, pausedRemaining: Math.max(0, state.endsAt - action.now) };
    case 'resume':
      return state.pausedRemaining === null
        ? state
        : { ...state, endsAt: action.now + state.pausedRemaining, pausedRemaining: null };
    case 'end':
      return { ...state, done: true };
  }
}

function initPlayer(exercises: Exercise[]): PlayerState {
  const plans = exercises.map(buildSteps);
  return startExercise(
    {
      exercises,
      plans,
      exIndex: 0,
      stepIndex: 0,
      endsAt: 0,
      pausedRemaining: null,
      results: exercises.map((ex) => ({ exerciseId: ex.id, setsCompleted: 0, repsCompleted: 0, skipped: true })),
      done: false,
    },
    0,
    Date.now(),
  );
}

const stepStyle: Record<Step['kind'], { ring: string; label: string }> = {
  ready: { ring: 'stroke-violet-400', label: 'Get ready' },
  work: { ring: 'stroke-coral-500', label: '' },
  relax: { ring: 'stroke-brand-400', label: 'Relax' },
  rest: { ring: 'stroke-sky-400', label: 'Rest' },
};

function Player({
  exercises,
  onFinish,
  onDiscard,
}: {
  exercises: Exercise[];
  onFinish: (results: SessionExerciseInput[]) => void;
  onDiscard: () => void;
}) {
  const [state, dispatch] = useReducer(playerReducer, exercises, initPlayer);
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSound] = useState(true);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [resumeAfterExit, setResumeAfterExit] = useState(false);
  const finished = useRef(false);

  const paused = state.pausedRemaining !== null;
  const exercise = state.exercises[state.exIndex]!;
  const plan = state.plans[state.exIndex]!;
  const step = plan[state.stepIndex]!;
  const remaining = state.pausedRemaining ?? Math.max(0, state.endsAt - now);

  useEffect(() => keepScreenAwake(), []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (!paused && remaining <= 0 && !state.done) dispatch({ type: 'advance', now: Date.now() });
  }, [paused, remaining, state.done]);

  // Audio and haptic cue whenever a hold starts or ends.
  useEffect(() => {
    if (step.kind === 'work') {
      if (sound) beep(880);
      vibrate(120);
    } else if (step.kind !== 'ready') {
      if (sound) beep(520);
      vibrate([60, 60, 60]);
    }
    // Cue on step changes only, not when the sound toggle flips.
  }, [state.exIndex, state.stepIndex]);

  useEffect(() => {
    if (state.done && !finished.current) {
      finished.current = true;
      onFinish(state.results);
    }
  }, [state.done, state.results, onFinish]);

  const seconds = Math.ceil(remaining / 1000);
  const fraction = step.seconds > 0 ? 1 - remaining / (step.seconds * 1000) : 1;
  const circumference = 2 * Math.PI * 88;
  const anyDone = state.results.some((r) => !r.skipped);
  const meta = categoryMeta[exercise.category];

  function openExitDialog() {
    setResumeAfterExit(!paused);
    dispatch({ type: 'pause', now: Date.now() });
    setConfirmingExit(true);
  }

  function keepGoing() {
    setConfirmingExit(false);
    if (resumeAfterExit) dispatch({ type: 'resume', now: Date.now() });
  }

  return (
    <Frame background="bg-sand-50" className="flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-6">
        <button
          type="button"
          onClick={openExitDialog}
          aria-label="End session"
          className="grid size-10 place-items-center rounded-full bg-white shadow-card"
        >
          <X className="size-5" />
        </button>
        <div className="flex flex-1 gap-1" aria-label={`Exercise ${state.exIndex + 1} of ${exercises.length}`}>
          {exercises.map((ex, i) => (
            <span
              key={ex.id}
              className={clsx(
                'h-1.5 flex-1 rounded-full',
                i < state.exIndex ? 'bg-brand-500' : i === state.exIndex ? 'bg-brand-300' : 'bg-sand-300',
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSound(!sound)}
          aria-label={sound ? 'Mute sounds' : 'Turn sounds on'}
          aria-pressed={sound}
          className="grid size-10 place-items-center rounded-full bg-white shadow-card"
        >
          {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5 text-ink-faint" />}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center px-5 pt-6 text-center">
        <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold', meta.tile)}>
          {meta.label} · {state.exIndex + 1} of {exercises.length}
        </span>
        <h1 className="mt-3 text-[26px] leading-tight font-extrabold tracking-tight">{exercise.name}</h1>

        <div className="relative my-6 size-56" role="timer" aria-live="off">
          <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden>
            <circle cx="100" cy="100" r="88" className="fill-white stroke-sand-200" strokeWidth="12" />
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              className={clsx(stepStyle[step.kind].ring, 'transition-[stroke-dashoffset] duration-200 ease-linear')}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, fraction)))}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-extrabold tabular-nums">{seconds}</span>
            <span className="mt-1 text-sm font-bold tracking-wide text-ink-soft uppercase">
              {paused ? 'Paused' : step.kind === 'work' ? exercise.cue : stepStyle[step.kind].label}
            </span>
          </div>
        </div>

        <p className="text-sm font-semibold text-ink-soft" aria-live="polite">
          {step.kind === 'ready'
            ? doseLabel(exercise)
            : `Rep ${step.rep} of ${exercise.reps}${exercise.sets > 1 ? ` · Set ${step.set} of ${exercise.sets}` : ''}`}
        </p>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => dispatch({ type: 'skip', now: Date.now() })}
            aria-label="Skip exercise"
            className="grid size-14 place-items-center rounded-full bg-white text-ink-soft shadow-card"
          >
            <SkipForward className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: paused ? 'resume' : 'pause', now: Date.now() })}
            aria-label={paused ? 'Resume' : 'Pause'}
            className="grid size-20 place-items-center rounded-full bg-brand-700 text-white shadow-lift"
          >
            {paused ? <Play className="size-8 fill-current" /> : <Pause className="size-8 fill-current" />}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'advance', now: Date.now() })}
            disabled={step.kind === 'work' || step.kind === 'relax'}
            aria-label={step.kind === 'ready' ? 'Start now' : 'Skip rest'}
            className="grid size-14 place-items-center rounded-full bg-white text-ink-soft shadow-card disabled:opacity-30"
          >
            <ArrowRight className="size-6" />
          </button>
        </div>

        <details className="mt-8 w-full rounded-3xl bg-white p-5 text-left shadow-card" open>
          <summary className="cursor-pointer font-bold">How to do it</summary>
          <ol className="mt-3 grid list-decimal gap-2 pl-5 text-[15px] text-ink-soft marker:font-bold marker:text-brand-600">
            {exercise.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {exercise.caution && <p className="mt-3 rounded-2xl bg-coral-50 p-3 text-sm text-coral-700">{exercise.caution}</p>}
        </details>
        <div className="h-8" />
      </div>

      {confirmingExit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="exit-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-lift">
            <h2 id="exit-title" className="text-xl font-extrabold">End the session early?</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {anyDone
                ? 'You can save what you have done so far. Stopping when something hurts is the right call.'
                : "You haven't finished any exercises yet, so there's nothing to save."}
            </p>
            <div className="mt-5 grid gap-2">
              <Button onClick={keepGoing}>Keep going</Button>
              {anyDone && (
                <Button variant="secondary" onClick={() => dispatch({ type: 'end' })}>
                  End and save
                </Button>
              )}
              <Button variant="ghost" onClick={onDiscard}>
                Leave without saving
              </Button>
            </div>
          </div>
        </div>
      )}
    </Frame>
  );
}

// ---------------------------------------------------------------------------

const toneStyles = {
  positive: 'bg-brand-50 text-brand-900 ring-brand-200',
  neutral: 'bg-sky-50 text-sky-900 ring-sky-100',
  warning: 'bg-coral-50 text-coral-700 ring-coral-100',
};

function Summary({ outcome }: { outcome: SessionResult }) {
  const { session, feedback, progress } = outcome;
  return (
    <Frame className="flex flex-col">
      <div className="flex-1 px-5 pt-14">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-brand-100 text-brand-700">
          <CircleCheck className="size-10" aria-hidden />
        </div>
        <h1 className="mt-5 text-center text-[28px] font-extrabold tracking-tight">Session saved</h1>

        <dl className="mt-7 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-3xl bg-white p-4 shadow-card">
            <dt className="text-xs font-semibold text-ink-faint">Exercises</dt>
            <dd className="mt-1 text-xl font-extrabold tabular-nums">
              {session.completedCount}/{session.exerciseCount}
            </dd>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-card">
            <dt className="flex items-center justify-center gap-1 text-xs font-semibold text-ink-faint">
              <Clock className="size-3" aria-hidden /> Time
            </dt>
            <dd className="mt-1 text-xl font-extrabold tabular-nums">{formatDuration(session.durationSeconds)}</dd>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-card">
            <dt className="flex items-center justify-center gap-1 text-xs font-semibold text-ink-faint">
              <TrendingDown className="size-3" aria-hidden /> Pain
            </dt>
            <dd className="mt-1 text-xl font-extrabold tabular-nums">
              {session.painBefore} → {session.painAfter}
            </dd>
          </div>
        </dl>

        <div className={clsx('mt-5 rounded-3xl p-5 ring-1', toneStyles[feedback.tone])}>
          <p className="font-bold">{feedback.title}</p>
          <p className="mt-1 text-sm opacity-90">{feedback.message}</p>
        </div>

        {progress.next && (
          <div className="mt-5 rounded-3xl bg-white p-5 shadow-card">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Phase {progress.phase} progress</span>
              <span className="font-bold tabular-nums">
                {Math.min(progress.sessionsInPhase, progress.sessionsRequired)}/{progress.sessionsRequired} sessions
              </span>
            </div>
            <ProgressBar value={progress.sessionsInPhase} max={progress.sessionsRequired} className="mt-2" />
            {progress.eligible && (
              <p className="mt-3 text-sm font-semibold text-brand-700">
                You're ready for Phase {progress.next.phase}: {progress.next.name}. Unlock it from your home screen.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="pb-safe px-5 pt-6">
        <Link
          to="/"
          className="flex h-14 items-center justify-center rounded-2xl bg-brand-700 font-semibold text-white hover:bg-brand-800"
        >
          Back to home
        </Link>
      </div>
    </Frame>
  );
}
