import { exerciseSeeds } from './exercises';
import type { Db } from './sqlite';

/** Upserts the exercise library by slug, so app updates can revise exercises on existing installs. */
export function seedExercises(db: Db): void {
  db.transaction(() => {
    exerciseSeeds.forEach((ex, index) => {
      db.run(
        `INSERT INTO exercises
           (slug, name, category, phase, summary, steps, sets, reps, hold_seconds, cue, rest_seconds, equipment, caution, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (slug) DO UPDATE SET
           name = excluded.name, category = excluded.category, phase = excluded.phase, summary = excluded.summary,
           steps = excluded.steps, sets = excluded.sets, reps = excluded.reps, hold_seconds = excluded.hold_seconds,
           cue = excluded.cue, rest_seconds = excluded.rest_seconds, equipment = excluded.equipment,
           caution = excluded.caution, sort_order = excluded.sort_order`,
        ex.slug,
        ex.name,
        ex.category,
        ex.phase,
        ex.summary,
        JSON.stringify(ex.steps),
        ex.sets,
        ex.reps,
        ex.holdSeconds,
        ex.cue,
        ex.restSeconds,
        ex.equipment ?? null,
        ex.caution ?? null,
        index,
      );
    });
  });
}
