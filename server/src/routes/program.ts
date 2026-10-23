import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/index.js';
import { todayFrom } from '../lib/dates.js';
import { HttpError, parse } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';
import { buildRoutine, FLARE_PAIN, latestPain, phaseProgress, type Phase } from '../services/program.js';
import { getAccount, getProfile } from '../services/users.js';

const painNowSchema = z.coerce.number().int().min(0).max(10).optional();
const phaseSchema = z.object({ phase: z.union([z.literal(1), z.literal(2), z.literal(3)]), today: z.string().optional() });

export function programRouter(db: DB) {
  const router = Router();

  /** Today's routine. Pass ?painNow=N from the pre-session check to adapt it to how the user feels right now. */
  router.get('/today', (req, res) => {
    const userId = currentUser(req);
    const today = todayFrom(req.query.today);
    const painNow = parse(painNowSchema, req.query.painNow);
    const { phase } = getProfile(db, userId);
    const pain = painNow ?? latestPain(db, userId, today);
    res.json({ ...buildRoutine(db, phase, pain !== null && pain >= FLARE_PAIN), painReference: pain });
  });

  router.get('/progress', (req, res) => {
    const userId = currentUser(req);
    const { phase, phaseStartedAt } = getProfile(db, userId);
    res.json(phaseProgress(db, userId, phase, phaseStartedAt, todayFrom(req.query.today)));
  });

  /** Move up one phase once the criteria are met, or step back to an earlier phase at any time. */
  router.post('/phase', (req, res) => {
    const userId = currentUser(req);
    const body = parse(phaseSchema, req.body);
    const { phase, phaseStartedAt } = getProfile(db, userId);
    const target: Phase = body.phase;

    if (target === phase) throw new HttpError(400, `You are already in phase ${phase}`);
    if (target > phase) {
      if (target !== phase + 1) throw new HttpError(400, 'Phases unlock one at a time');
      const progress = phaseProgress(db, userId, phase, phaseStartedAt, todayFrom(body.today));
      if (!progress.eligible) throw new HttpError(409, 'Not ready for the next phase yet', progress.criteria);
    }

    db.prepare(
      `UPDATE profiles SET phase = ?, phase_started_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ?`,
    ).run(target, userId);
    res.json(getAccount(db, userId));
  });

  return router;
}
