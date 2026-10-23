import clsx from 'clsx';
import { Lock, Package, TriangleAlert } from 'lucide-react';
import { useParams } from 'react-router';
import { useExercise } from '../api/hooks';
import { ErrorState, PageHeader, Spinner } from '../components/ui';
import { categoryMeta, phaseNames } from '../lib/exercise-meta';

export function ExerciseDetailPage() {
  const { slug = '' } = useParams();
  const { data: ex, error, isPending, refetch } = useExercise(slug);

  if (isPending) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const meta = categoryMeta[ex.category];
  const stats = [
    { label: 'Sets', value: ex.sets },
    { label: 'Reps', value: ex.reps },
    { label: 'Each rep', value: `${ex.holdSeconds}s` },
    { label: 'Rest', value: `${ex.restSeconds}s` },
  ];

  return (
    <div>
      <PageHeader back title={ex.name} />
      <div className="grid gap-5 px-5">
        <section className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <span className={clsx('grid size-14 place-items-center rounded-2xl', meta.tile)}>{meta.icon}</span>
            <div>
              <p className="text-sm font-bold">{meta.label}</p>
              <p className="text-sm text-ink-soft">
                Phase {ex.phase} · {phaseNames[ex.phase]}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[15px] text-ink-soft">{ex.summary}</p>
          <dl className="mt-5 grid grid-cols-4 divide-x divide-sand-200 rounded-2xl bg-sand-50 py-3 ring-1 ring-sand-200">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">{s.label}</dt>
                <dd className="mt-0.5 text-lg font-extrabold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {!ex.unlocked && (
          <p className="flex gap-3 rounded-2xl bg-sand-50 p-4 text-sm text-ink-soft ring-1 ring-sand-200">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            This is part of Phase {ex.phase}. You can read through it now; it joins your daily routine once you unlock
            that phase.
          </p>
        )}

        <section>
          <h2 className="mb-3 text-[17px] font-bold">How to do it</h2>
          <ol className="grid gap-3">
            {ex.steps.map((step, i) => (
              <li key={i} className="flex gap-4 rounded-2xl bg-white p-4 shadow-card">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                  {i + 1}
                </span>
                <span className="text-[15px]">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {ex.equipment && (
          <p className="flex gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-100">
            <Package className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold">You'll need:</strong> {ex.equipment}
            </span>
          </p>
        )}
        {ex.caution && (
          <p className="flex gap-3 rounded-2xl bg-coral-50 p-4 text-sm text-coral-700 ring-1 ring-coral-100">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {ex.caution}
          </p>
        )}
      </div>
    </div>
  );
}
