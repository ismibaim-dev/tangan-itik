import type { Db } from './sqlite';
import type { Exercise, ExerciseCategory, Phase } from './types';

interface ExerciseRow {
  id: number;
  slug: string;
  name: string;
  category: ExerciseCategory;
  phase: Phase;
  summary: string;
  steps: string;
  sets: number;
  reps: number;
  hold_seconds: number;
  cue: string;
  rest_seconds: number;
  equipment: string | null;
  caution: string | null;
}

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    phase: row.phase,
    summary: row.summary,
    steps: JSON.parse(row.steps) as string[],
    sets: row.sets,
    reps: row.reps,
    holdSeconds: row.hold_seconds,
    cue: row.cue,
    restSeconds: row.rest_seconds,
    equipment: row.equipment,
    caution: row.caution,
  };
}

export function listExercises(db: Db): Exercise[] {
  return db.all<ExerciseRow>('SELECT * FROM exercises ORDER BY phase, sort_order').map(toExercise);
}

export function findExercise(db: Db, slug: string): Exercise | undefined {
  const row = db.get<ExerciseRow>('SELECT * FROM exercises WHERE slug = ?', slug);
  return row && toExercise(row);
}

/** Fetches exercises in the order the slugs are given. */
export function exercisesBySlug(db: Db, slugs: string[]): Exercise[] {
  const bySlug = new Map(listExercises(db).map((ex) => [ex.slug, ex]));
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}
