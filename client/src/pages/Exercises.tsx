import clsx from 'clsx';
import { ChevronRight, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useExercises } from '../data/hooks';
import type { ExerciseCategory, Phase } from '../data/types';
import { ErrorState, PageHeader, Spinner } from '../components/ui';
import { categoryMeta, doseLabel, phaseNames } from '../lib/exercise-meta';

const filters: (ExerciseCategory | 'all')[] = ['all', 'nerve_glide', 'tendon_glide', 'mobility', 'stretch', 'strength'];

export function ExercisesPage() {
  const { data, error, isPending, refetch } = useExercises();
  const [filter, setFilter] = useState<ExerciseCategory | 'all'>('all');

  return (
    <div>
      <PageHeader title="Exercise library" subtitle="Every movement in your programme, with step-by-step guidance." />
      <div className="-mt-1 flex gap-2 overflow-x-auto px-5 pb-4 [scrollbar-width:none]" role="toolbar" aria-label="Filter by type">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={clsx(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
              filter === f ? 'bg-ink text-white' : 'bg-white text-ink-soft shadow-card hover:text-ink',
            )}
          >
            {f === 'all' ? 'All' : categoryMeta[f].plural}
          </button>
        ))}
      </div>

      {isPending && <Spinner />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && (
        <div className="grid grid-cols-1 gap-7 px-5">
          {([1, 2, 3] as Phase[]).map((phase) => {
            const items = data.exercises.filter((ex) => ex.phase === phase && (filter === 'all' || ex.category === filter));
            if (items.length === 0) return null;
            const locked = phase > data.currentPhase;
            return (
              <section key={phase} aria-labelledby={`phase-${phase}`}>
                <h2 id={`phase-${phase}`} className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
                  Phase {phase} · {phaseNames[phase]}
                  {locked && <Lock className="size-3.5" aria-label="Locked" />}
                </h2>
                <ul className="grid grid-cols-1 gap-3">
                  {items.map((ex) => (
                    <li key={ex.slug}>
                      <Link
                        to={`/exercises/${ex.slug}`}
                        className={clsx(
                          'flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card transition hover:shadow-lift',
                          locked && 'opacity-70',
                        )}
                      >
                        <span className={clsx('grid size-12 shrink-0 place-items-center rounded-2xl', categoryMeta[ex.category].tile)}>
                          {categoryMeta[ex.category].icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold">{ex.name}</span>
                          <span className="mt-0.5 block truncate text-sm text-ink-soft">{ex.summary}</span>
                          <span className="mt-1 block text-xs font-semibold text-ink-faint">
                            {locked ? `Unlocks in Phase ${phase}` : doseLabel(ex)}
                          </span>
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-ink-faint" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
