import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/index.js';
import { localDateSchema } from '../lib/dates.js';
import { parse } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';
import { ASSESSMENT_QUESTIONS, scoreAssessment, severityBand } from '../services/assessment.js';

const createSchema = z.object({
  localDate: localDateSchema,
  answers: z
    .array(z.number().int().min(1).max(5))
    .length(ASSESSMENT_QUESTIONS.length, `Answer all ${ASSESSMENT_QUESTIONS.length} questions`),
});

interface AssessmentRow {
  id: number;
  localDate: string;
  takenAt: string;
  answers: string;
  score: number;
}

function toAssessment(row: AssessmentRow) {
  return { ...row, answers: JSON.parse(row.answers) as number[], band: severityBand(row.score) };
}

const select = 'SELECT id, local_date AS localDate, taken_at AS takenAt, answers, score FROM assessments';

export function assessmentsRouter(db: DB) {
  const router = Router();

  router.get('/questions', (_req, res) => {
    res.json(ASSESSMENT_QUESTIONS);
  });

  router.post('/', (req, res) => {
    const userId = currentUser(req);
    const body = parse(createSchema, req.body);
    const score = scoreAssessment(body.answers);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO assessments (user_id, local_date, answers, score) VALUES (?, ?, ?, ?)')
      .run(userId, body.localDate, JSON.stringify(body.answers), score);

    const current = db.prepare(`${select} WHERE id = ?`).get(lastInsertRowid) as AssessmentRow;
    const previous = db
      .prepare(`${select} WHERE user_id = ? AND id < ? ORDER BY id DESC LIMIT 1`)
      .get(userId, lastInsertRowid) as AssessmentRow | undefined;
    res.status(201).json({
      assessment: toAssessment(current),
      previous: previous ? toAssessment(previous) : null,
    });
  });

  router.get('/', (req, res) => {
    const rows = db
      .prepare(`${select} WHERE user_id = ? ORDER BY taken_at DESC LIMIT 52`)
      .all(currentUser(req)) as AssessmentRow[];
    res.json(rows.map(toAssessment));
  });

  return router;
}
