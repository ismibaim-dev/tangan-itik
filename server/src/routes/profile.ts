import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/index.js';
import { parse } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';
import { getAccount } from '../services/users.js';

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    affectedHand: z.enum(['left', 'right', 'both']),
    dominantHand: z.enum(['left', 'right']),
    symptomDuration: z.enum(['under_3_months', '3_to_12_months', 'over_12_months']).nullable(),
    postSurgery: z.boolean(),
    goals: z.array(z.string().trim().min(1).max(60)).max(6),
    reminderTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Reminder time must be HH:MM')
      .nullable(),
    onboarded: z.literal(true),
  })
  .partial()
  .strict();

const columns = {
  affectedHand: 'affected_hand',
  dominantHand: 'dominant_hand',
  symptomDuration: 'symptom_duration',
  postSurgery: 'post_surgery',
  goals: 'goals',
  reminderTime: 'reminder_time',
  onboarded: 'onboarded',
} as const;

export function profileRouter(db: DB) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(getAccount(db, currentUser(req)));
  });

  router.patch('/', (req, res) => {
    const userId = currentUser(req);
    const { name, ...fields } = parse(updateSchema, req.body);

    db.transaction(() => {
      if (name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);

      const sets: string[] = [];
      const values: unknown[] = [];
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) continue;
        sets.push(`${columns[key as keyof typeof columns]} = ?`);
        values.push(typeof value === 'boolean' ? Number(value) : Array.isArray(value) ? JSON.stringify(value) : value);
      }
      if (sets.length > 0) {
        db.prepare(
          `UPDATE profiles SET ${sets.join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ?`,
        ).run(...values, userId);
      }
    })();

    res.json(getAccount(db, userId));
  });

  return router;
}
