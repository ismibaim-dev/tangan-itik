import clsx from 'clsx';
import { Bed, BriefcaseMedical, ChevronLeft, Clock, Hand, Info, Keyboard, Sparkles, Trophy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useCreateProfile } from '../data/hooks';
import type { Hand as HandSide, SymptomDuration } from '../data/types';
import { Frame } from '../components/AppShell';
import { Button, Field, FormError, Input, OptionCard } from '../components/ui';
import { canNotify, setDailyReminder } from '../lib/notifications';

const GOALS: { label: string; icon: ReactNode }[] = [
  { label: 'Sleep through the night', icon: <Bed className="size-5" aria-hidden /> },
  { label: 'Type without pain', icon: <Keyboard className="size-5" aria-hidden /> },
  { label: 'Stronger grip', icon: <Hand className="size-5" aria-hidden /> },
  { label: 'Get back to a hobby or sport', icon: <Trophy className="size-5" aria-hidden /> },
  { label: 'Avoid or delay surgery', icon: <BriefcaseMedical className="size-5" aria-hidden /> },
];

interface Answers {
  name: string;
  affectedHand: HandSide | null;
  dominantHand: 'left' | 'right' | null;
  symptomDuration: SymptomDuration | null;
  postSurgery: boolean | null;
  goals: string[];
  reminderTime: string;
  remind: boolean;
  acknowledged: boolean;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const create = useCreateProfile();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    name: '',
    affectedHand: null,
    dominantHand: null,
    symptomDuration: null,
    postSurgery: null,
    goals: [],
    reminderTime: '19:00',
    remind: true,
    acknowledged: false,
  });
  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }));

  const steps: { title: string; subtitle?: string; ready: boolean; body: ReactNode }[] = [
    {
      title: 'What should we call you?',
      subtitle: 'A first name is fine. Like everything else, it stays on this phone.',
      ready: answers.name.trim().length > 0,
      body: (
        <Field label="First name">
          <Input
            autoFocus
            autoComplete="given-name"
            maxLength={80}
            value={answers.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
      ),
    },
    {
      title: 'Which hand is affected?',
      subtitle: 'We will remind you which side to focus on.',
      ready: answers.affectedHand !== null,
      body: (['right', 'left', 'both'] as const).map((side) => (
        <OptionCard
          key={side}
          selected={answers.affectedHand === side}
          onClick={() => set('affectedHand', side)}
          title={side === 'both' ? 'Both hands' : `${side[0]!.toUpperCase()}${side.slice(1)} hand`}
          icon={<Hand className={clsx('size-5', side === 'left' && '-scale-x-100')} aria-hidden />}
        />
      )),
    },
    {
      title: 'Which hand do you write with?',
      subtitle: 'Your dominant hand usually does more of the daily gripping.',
      ready: answers.dominantHand !== null,
      body: (['right', 'left'] as const).map((side) => (
        <OptionCard
          key={side}
          selected={answers.dominantHand === side}
          onClick={() => set('dominantHand', side)}
          title={side === 'right' ? 'Right-handed' : 'Left-handed'}
        />
      )),
    },
    {
      title: 'How long have you had symptoms?',
      ready: answers.symptomDuration !== null,
      body: (
        [
          ['under_3_months', 'Less than 3 months', 'Recent tingling, numbness or pain'],
          ['3_to_12_months', '3 to 12 months', 'Symptoms come and go, often at night'],
          ['over_12_months', 'More than a year', 'Long-standing or frequent symptoms'],
        ] as const
      ).map(([value, title, description]) => (
        <OptionCard
          key={value}
          selected={answers.symptomDuration === value}
          onClick={() => set('symptomDuration', value)}
          title={title}
          description={description}
          icon={<Clock className="size-5" aria-hidden />}
        />
      )),
    },
    {
      title: 'Have you had carpal tunnel release surgery?',
      ready: answers.postSurgery !== null,
      body: (
        <>
          <OptionCard selected={answers.postSurgery === false} onClick={() => set('postSurgery', false)} title="No" />
          <OptionCard selected={answers.postSurgery === true} onClick={() => set('postSurgery', true)} title="Yes" />
          {answers.postSurgery && (
            <p className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              After surgery, follow your surgeon's or hand therapist's timeline first. Check with them before starting
              this programme, especially the stretching and strengthening phases.
            </p>
          )}
        </>
      ),
    },
    {
      title: 'What would you like to get back to?',
      subtitle: 'Pick as many as you like.',
      ready: answers.goals.length > 0,
      body: GOALS.map((goal) => {
        const selected = answers.goals.includes(goal.label);
        return (
          <OptionCard
            key={goal.label}
            role="checkbox"
            selected={selected}
            onClick={() =>
              set('goals', selected ? answers.goals.filter((g) => g !== goal.label) : [...answers.goals, goal.label])
            }
            title={goal.label}
            icon={goal.icon}
          />
        );
      }),
    },
    {
      title: 'When will you practise?',
      subtitle: 'A regular time makes the habit stick. Ten minutes is enough.',
      ready: answers.acknowledged,
      body: (
        <>
          <Field label="Daily practice time">
            <Input type="time" value={answers.reminderTime} onChange={(e) => set('reminderTime', e.target.value)} />
          </Field>
          {canNotify && (
            <label className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-medium shadow-card">
              <input
                type="checkbox"
                checked={answers.remind}
                onChange={(e) => set('remind', e.target.checked)}
                className="size-5 shrink-0 accent-brand-600"
              />
              Send me a daily reminder at this time
            </label>
          )}
          <div className="rounded-2xl bg-white p-4 text-sm text-ink-soft shadow-card">
            <p className="font-semibold text-ink">Before you start</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Movements should feel easy. A mild stretch is fine; sharp pain or rising tingling is not.</li>
              <li>See a clinician if numbness is constant, you keep dropping things, or the base of your thumb looks thinner.</li>
            </ul>
            <label className="mt-4 flex items-start gap-3 font-medium text-ink">
              <input
                type="checkbox"
                checked={answers.acknowledged}
                onChange={(e) => set('acknowledged', e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-brand-600"
              />
              I understand GripWise supports, but does not replace, medical advice.
            </label>
          </div>
        </>
      ),
    },
  ];

  const current = steps[step]!;
  const last = step === steps.length - 1;

  async function next() {
    if (!last) {
      setStep(step + 1);
      return;
    }
    const reminderTime = answers.reminderTime || null;
    // Ask for notification permission now, while the reminder is what the user is looking at.
    if (canNotify && answers.remind && reminderTime) await setDailyReminder(reminderTime).catch(() => undefined);
    create.mutate({
      name: answers.name,
      affectedHand: answers.affectedHand!,
      dominantHand: answers.dominantHand!,
      symptomDuration: answers.symptomDuration,
      postSurgery: answers.postSurgery!,
      goals: answers.goals,
      reminderTime,
    });
  }

  return (
    <Frame className="flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-6">
        <button
          type="button"
          onClick={() => (step === 0 ? navigate('/welcome') : setStep(step - 1))}
          aria-label={step === 0 ? 'Back to welcome' : 'Previous question'}
          className="grid size-10 place-items-center rounded-full bg-white shadow-card"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex flex-1 gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((_, i) => (
            <span key={i} className={clsx('h-1.5 flex-1 rounded-full', i <= step ? 'bg-brand-500' : 'bg-sand-300')} />
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 pt-8">
        {step === 1 && (
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-700">
            <Sparkles className="size-4" aria-hidden /> Hi {answers.name.trim()}, let's build your plan
          </p>
        )}
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-balance">{current.title}</h1>
        {current.subtitle && <p className="mt-2 text-ink-soft">{current.subtitle}</p>}
        <div className="mt-6 grid gap-3">{current.body}</div>
      </div>

      <div className="pb-safe sticky bottom-0 grid gap-3 bg-gradient-to-t from-sand-100 via-sand-100 px-5 pt-6">
        <FormError error={create.error} />
        <Button size="lg" block disabled={!current.ready} loading={create.isPending} onClick={next}>
          {last ? 'Start my plan' : 'Continue'}
        </Button>
      </div>
    </Frame>
  );
}
