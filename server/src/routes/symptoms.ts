import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/index.js';
import { localDateSchema } from '../lib/dates.js';
import { HttpError, parse } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';

const score = z.number().int().min(0).max(10);

const createSchema = z.object({
  localDate: localDateSchema,
  pain: score,
  numbness: score,
  tingling: score,
  nightWaking: z.number().int().min(0).max(10).default(0),
  gripStrengthKg: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});

const listSchema = z.object({ limit: z.coerce.number().int().min(1).max(200).default(30) });

const select = `
  SELECT id, local_date AS localDate, logged_at AS loggedAt, pain, numbness, tingling,
         night_waking AS nightWaking, grip_strength_kg AS gripStrengthKg, notes
  FROM symptom_logs
`;

export function symptomsRouter(db: DB) {
  const router = Router();

  router.post('/', (req, res) => {
    const userId = currentUser(req);
    const body = parse(createSchema, req.body);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO symptom_logs (user_id, local_date, pain, numbness, tingling, night_waking, grip_strength_kg, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        body.localDate,
        body.pain,
        body.numbness,
        body.tingling,
        body.nightWaking,
        body.gripStrengthKg ?? null,
        body.notes || null,
      );
    res.status(201).json(db.prepare(`${select} WHERE id = ?`).get(lastInsertRowid));
  });

  router.get('/', (req, res) => {
    const { limit } = parse(listSchema, req.query);
    res.json(db.prepare(`${select} WHERE user_id = ? ORDER BY logged_at DESC LIMIT ?`).all(currentUser(req), limit));
  });

  router.delete('/:id', (req, res) => {
    const { changes } = db
      .prepare('DELETE FROM symptom_logs WHERE id = ? AND user_id = ?')
      .run(Number(req.params.id), currentUser(req));
    if (changes === 0) throw new HttpError(404, 'Log not found');
    res.status(204).end();
  });

  return router;
}
