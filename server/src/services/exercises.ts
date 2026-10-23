import type { DB } from '../db/index.js';
import type { ExerciseCategory } from '../db/exercises.js';

export interface Exercise {
  id: number;
  slug: string;
  name: string;
  category: ExerciseCategory;
  phase: number;
  summary: string;
  steps: string[];
  sets: number;
  reps: number;
  holdSeconds: number;
  cue: string;
  restSeconds: number;
  equipment: string | null;
  caution: string | null;
}

interface ExerciseRow {
  id: number;
  slug: string;
  name: string;
  category: ExerciseCategory;
  phase: number;
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

export function listExercises(db: DB): Exercise[] {
  const rows = db.prepare('SELECT * FROM exercises ORDER BY phase, sort_order').all() as ExerciseRow[];
  return rows.map(toExercise);
}

export function getExercise(db: DB, slug: string): Exercise | undefined {
  const row = db.prepare('SELECT * FROM exercises WHERE slug = ?').get(slug) as ExerciseRow | undefined;
  return row && toExercise(row);
}

/** Fetches exercises in the order the slugs are given. */
export function getExercisesBySlug(db: DB, slugs: string[]): Exercise[] {
  const bySlug = new Map(listExercises(db).map((ex) => [ex.slug, ex]));
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}
