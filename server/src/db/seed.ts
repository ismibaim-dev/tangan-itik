import type { DB } from './index.js';
import { exerciseSeeds } from './exercises.js';

export function seedExercises(db: DB): void {
  const upsert = db.prepare(`
    INSERT INTO exercises
      (slug, name, category, phase, summary, steps, sets, reps, hold_seconds, cue, rest_seconds, equipment, caution, sort_order)
    VALUES
      (@slug, @name, @category, @phase, @summary, @steps, @sets, @reps, @holdSeconds, @cue, @restSeconds, @equipment, @caution, @sortOrder)
    ON CONFLICT (slug) DO UPDATE SET
      name = excluded.name, category = excluded.category, phase = excluded.phase, summary = excluded.summary,
      steps = excluded.steps, sets = excluded.sets, reps = excluded.reps, hold_seconds = excluded.hold_seconds,
      cue = excluded.cue, rest_seconds = excluded.rest_seconds, equipment = excluded.equipment,
      caution = excluded.caution, sort_order = excluded.sort_order
  `);
  db.transaction(() => {
    exerciseSeeds.forEach((exercise, index) => {
      upsert.run({
        ...exercise,
        steps: JSON.stringify(exercise.steps),
        equipment: exercise.equipment ?? null,
        caution: exercise.caution ?? null,
        sortOrder: index,
      });
    });
  })();
}
