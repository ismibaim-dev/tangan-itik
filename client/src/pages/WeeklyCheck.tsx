import clsx from 'clsx';
import { ChevronLeft, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuestions, useSubmitAssessment } from '../data/hooks';
import { Frame } from '../components/AppShell';
import { Button, FormError, ProgressBar } from '../components/ui';

export function WeeklyCheckPage() {
  const navigate = useNavigate();
  const questions = useQuestions();
  const submit = useSubmitAssessment();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  if (submit.data) return <Result {...submit.data} />;

  const list = questions.data;
  const question = list[index];
  const answer = answers[index] ?? null;
  const last = index === list.length - 1;

  function choose(value: number) {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
    // Move on automatically; the final answer waits for an explicit submit.
    if (!last) window.setTimeout(() => setIndex((i) => Math.min(i + 1, list.length - 1)), 180);
  }

  return (
    <Frame className="flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-6">
        <button
          type="button"
          onClick={() => (index === 0 ? navigate(-1) : setIndex(index - 1))}
          aria-label={index === 0 ? 'Close' : 'Previous question'}
          className="grid size-10 place-items-center rounded-full bg-white shadow-card"
        >
          {index === 0 ? <X className="size-5" /> : <ChevronLeft className="size-5" />}
        </button>
        <ProgressBar value={index + (answer !== null ? 1 : 0)} max={list.length || 11} className="flex-1" />
        <span className="w-12 text-right text-sm font-semibold text-ink-soft tabular-nums">
          {list.length ? `${index + 1}/${list.length}` : ''}
        </span>
      </div>

      {question && (
        <div className="flex-1 px-5 pt-8">
          <p className="text-sm font-semibold text-violet-700">Weekly symptom check</p>
          <h1 className="mt-2 text-2xl leading-snug font-extrabold tracking-tight text-balance">{question.text}</h1>
          <div className="mt-6 grid gap-2.5" role="radiogroup" aria-label={question.text}>
            {question.options.map((option, i) => {
              const value = i + 1;
              const selected = answer === value;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => choose(value)}
                  className={clsx(
                    'flex items-center gap-4 rounded-2xl p-4 text-left font-semibold transition',
                    selected ? 'bg-violet-50 ring-2 ring-violet-500' : 'bg-white shadow-card ring-1 ring-sand-200 hover:ring-violet-200',
                  )}
                >
                  <span
                    className={clsx(
                      'grid size-8 shrink-0 place-items-center rounded-full text-sm',
                      selected ? 'bg-violet-600 text-white' : 'bg-sand-100 text-ink-soft',
                    )}
                  >
                    {value}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {question && last && (
        <div className="pb-safe grid gap-3 px-5 pt-6">
          <FormError error={submit.error} />
          <Button
            size="lg"
            block
            disabled={answers.filter((a) => a != null).length !== list.length}
            loading={submit.isPending}
            onClick={() => submit.mutate(answers as number[])}
          >
            See my score
          </Button>
        </div>
      )}
    </Frame>
  );
}

const bandStyle: Record<string, string> = {
  'No symptoms': 'bg-brand-100 text-brand-800',
  Mild: 'bg-brand-100 text-brand-800',
  Moderate: 'bg-amber-100 text-amber-800',
  Severe: 'bg-coral-100 text-coral-700',
  'Very severe': 'bg-coral-100 text-coral-700',
};

function Result({
  assessment,
  previous,
}: {
  assessment: { score: number; band: string };
  previous: { score: number } | null;
}) {
  const change = previous ? Math.round((assessment.score - previous.score) * 100) / 100 : null;
  return (
    <Frame className="flex flex-col">
      <div className="flex-1 px-5 pt-14 text-center">
        <p className="text-sm font-semibold text-violet-700">Your symptom score</p>
        <p className="mt-3 text-7xl font-extrabold tracking-tight tabular-nums">{assessment.score.toFixed(1)}</p>
        <p className="mt-1 text-sm text-ink-soft">on a scale of 1 (no symptoms) to 5 (most severe)</p>
        <span className={clsx('mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-bold', bandStyle[assessment.band])}>
          {assessment.band}
        </span>

        {change !== null && (
          <div className="mx-auto mt-8 flex max-w-sm items-center gap-3 rounded-3xl bg-white p-5 text-left shadow-card">
            {change <= 0 ? (
              <TrendingDown className="size-7 shrink-0 text-brand-600" aria-hidden />
            ) : (
              <TrendingUp className="size-7 shrink-0 text-coral-600" aria-hidden />
            )}
            <p className="text-sm text-ink-soft">
              {change < 0 && (
                <>
                  <strong className="text-ink">{Math.abs(change).toFixed(1)} lower</strong> than last time. Lower is
                  better, so your symptoms are easing.
                </>
              )}
              {change === 0 && <>The same as last time. Steady progress still counts.</>}
              {change > 0 && (
                <>
                  <strong className="text-ink">{change.toFixed(1)} higher</strong> than last time. If symptoms keep
                  rising for a few weeks, talk to your clinician.
                </>
              )}
            </p>
          </div>
        )}
        <p className="mx-auto mt-8 max-w-sm text-xs text-ink-faint">
          Adapted from the Boston Carpal Tunnel Questionnaire symptom scale. Useful for tracking change over time, not
          for diagnosis.
        </p>
      </div>
      <div className="pb-safe px-5 pt-6">
        <Link
          to="/progress"
          className="flex h-14 items-center justify-center rounded-2xl bg-brand-700 font-semibold text-white hover:bg-brand-800"
        >
          See my progress
        </Link>
      </div>
    </Frame>
  );
}
