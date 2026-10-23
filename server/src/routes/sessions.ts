import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/index.js';
import { localDateSchema } from '../lib/dates.js';
import { HttpError, parse } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';
import { phaseProgress, sessionFeedback } from '../services/program.js';
import { getProfile } from '../services/users.js';

const pain = z.number().int().min(0).max(10);

const createSchema = z.object({
  localDate: localDateSchema,
  startedAt: z.iso.datetime(),
  durationSeconds: z.number().int().min(0).max(4 * 60 * 60),
  painBefore: pain,
  painAfter: pain,
  flareMode: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional(),
  exercises: z
    .array(
      z.object({
        exerciseId: z.number().int().positive(),
        setsCompleted: z.number().int().min(0).max(20),
        repsCompleted: z.number().int().min(0).max(500),
        skipped: z.boolean(),
      }),
    )
    .min(1, 'A session needs at least one exercise')
    .max(30),
});

const listSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) });

interface SessionRow {
  id: number;
  local_date: string;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  phase: number;
  flare_mode: number;
  pain_before: number;
  pain_after: number;
  notes: string | null;
  exercise_count: number;
  completed_count: number;
}

function toSession(row: SessionRow) {
  return {
    id: row.id,
    localDate: row.local_date,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    phase: row.phase,
    flareMode: row.flare_mode === 1,
    painBefore: row.pain_before,
    painAfter: row.pain_after,
    notes: row.notes,
    exerciseCount: row.exercise_count,
    completedCount: row.completed_count,
  };
}

const sessionSelect = `
  SELECT s.*,
         COUNT(se.id) AS exercise_count,
         COALESCE(SUM(CASE WHEN se.skipped = 0 THEN 1 ELSE 0 END), 0) AS completed_count
  FROM sessions s
  LEFT JOIN session_exercises se ON se.session_id = s.id
`;

export function sessionsRouter(db: DB) {
  const router = Router();

  router.post('/', (req, res) => {
    const userId = currentUser(req);
    const body = parse(createSchema, req.body);
    const profile = getProfile(db, userId);

    const ids = [...new Set(body.exercises.map((e) => e.exerciseId))];
    const { found } = db
      .prepare(`SELECT COUNT(*) AS found FROM exercises WHERE id IN (${ids.map(() => '?').join(',')})`)
      .get(...ids) as { found: number };
    if (found !== ids.length) throw new HttpError(400, 'Session includes an unknown exercise');
    if (body.exercises.every((e) => e.skipped)) throw new HttpError(400, 'Complete at least one exercise to log a session');

    const sessionId = db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO sessions (user_id, local_date, started_at, duration_seconds, phase, flare_mode, pain_before, pain_after, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          userId,
          body.localDate,
          body.startedAt,
          body.durationSeconds,
          profile.phase,
          Number(body.flareMode),
          body.painBefore,
          body.painAfter,
          body.notes || null,
        );
      const insertExercise = db.prepare(
        `INSERT INTO session_exercises (session_id, exercise_id, position, sets_completed, reps_completed, skipped)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      body.exercises.forEach((e, position) =>
        insertExercise.run(lastInsertRowid, e.exerciseId, position, e.setsCompleted, e.repsCompleted, Number(e.skipped)),
      );
      return Number(lastInsertRowid);
    })();

    const row = db.prepare(`${sessionSelect} WHERE s.id = ? GROUP BY s.id`).get(sessionId) as SessionRow;
    res.status(201).json({
      session: toSession(row),
      feedback: sessionFeedback(body.painBefore, body.painAfter),
      progress: phaseProgress(db, userId, profile.phase, profile.phaseStartedAt, body.localDate),
    });
  });

  router.get('/', (req, res) => {
    const { limit } = parse(listSchema, req.query);
    const rows = db
      .prepare(`${sessionSelect} WHERE s.user_id = ? GROUP BY s.id ORDER BY s.completed_at DESC LIMIT ?`)
      .all(currentUser(req), limit) as SessionRow[];
    res.json(rows.map(toSession));
  });

  router.get('/:id', (req, res) => {
    const userId = currentUser(req);
    const row = db
      .prepare(`${sessionSelect} WHERE s.id = ? AND s.user_id = ? GROUP BY s.id`)
      .get(Number(req.params.id), userId) as SessionRow | undefined;
    if (!row) throw new HttpError(404, 'Session not found');
    const exercises = db
      .prepare(
        `SELECT e.id AS exerciseId, e.slug, e.name, e.category, se.sets_completed AS setsCompleted,
                se.reps_completed AS repsCompleted, se.skipped
         FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id
         WHERE se.session_id = ? ORDER BY se.position`,
      )
      .all(row.id) as { skipped: number }[];
    res.json({ ...toSession(row), exercises: exercises.map((e) => ({ ...e, skipped: e.skipped === 1 })) });
  });

  return router;
}
