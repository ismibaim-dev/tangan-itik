import { Router } from 'express';
import type { DB } from '../db/index.js';
import { HttpError } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';
import { getExercise, listExercises } from '../services/exercises.js';
import { getProfile } from '../services/users.js';

export function exercisesRouter(db: DB) {
  const router = Router();

  router.get('/', (req, res) => {
    const { phase } = getProfile(db, currentUser(req));
    res.json({
      currentPhase: phase,
      exercises: listExercises(db).map((ex) => ({ ...ex, unlocked: ex.phase <= phase })),
    });
  });

  router.get('/:slug', (req, res) => {
    const exercise = getExercise(db, req.params.slug);
    if (!exercise) throw new HttpError(404, 'Exercise not found');
    const { phase } = getProfile(db, currentUser(req));
    res.json({ ...exercise, unlocked: exercise.phase <= phase });
  });

  return router;
}
