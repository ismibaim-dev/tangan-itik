// Read-only aggregates for the home dashboard and the progress screen.
import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/index.js';
import { addDays, currentStreak, longestStreak, todayFrom } from '../lib/dates.js';
import { parse } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';
import { severityBand } from '../services/assessment.js';
import { buildRoutine, FLARE_PAIN, latestPain, phaseProgress } from '../services/program.js';
import { getProfile, getUser } from '../services/users.js';

const rangeSchema = z.object({ days: z.coerce.number().int().min(7).max(365).default(30) });

const round1 = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

export function insightsRouter(db: DB) {
  const router = Router();

  router.get('/dashboard', (req, res) => {
    const userId = currentUser(req);
    const today = todayFrom(req.query.today);
    const user = getUser(db, userId);
    const profile = getProfile(db, userId);

    const sessionDates = (
      db.prepare('SELECT DISTINCT local_date AS d FROM sessions WHERE user_id = ?').all(userId) as { d: string }[]
    ).map((r) => r.d);
    const active = new Set(sessionDates);

    const { todaySessions } = db
      .prepare('SELECT COUNT(*) AS todaySessions FROM sessions WHERE user_id = ? AND local_date = ?')
      .get(userId, today) as { todaySessions: number };

    const latestSymptom = db
      .prepare(
        `SELECT local_date AS localDate, logged_at AS loggedAt, pain, numbness, tingling
         FROM symptom_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT 1`,
      )
      .get(userId) as { localDate: string; pain: number; numbness: number; tingling: number } | undefined;

    const lastAssessment = db
      .prepare('SELECT local_date AS localDate, score FROM assessments WHERE user_id = ? ORDER BY taken_at DESC LIMIT 1')
      .get(userId) as { localDate: string; score: number } | undefined;

    const pain = latestPain(db, userId, today);
    const routine = buildRoutine(db, profile.phase, pain !== null && pain >= FLARE_PAIN);

    res.json({
      name: user.name,
      today,
      streak: currentStreak(active, today),
      week: Array.from({ length: 7 }, (_, i) => {
        const date = addDays(today, i - 6);
        return { date, done: active.has(date) };
      }),
      todaySessions,
      routine: {
        exerciseCount: routine.exercises.length,
        estimatedMinutes: routine.estimatedMinutes,
        flareMode: routine.flareMode,
      },
      phase: phaseProgress(db, userId, profile.phase, profile.phaseStartedAt, today),
      latestSymptom: latestSymptom ?? null,
      lastAssessment: lastAssessment ? { ...lastAssessment, band: severityBand(lastAssessment.score) } : null,
      assessmentDue: !lastAssessment || lastAssessment.localDate <= addDays(today, -7),
    });
  });

  router.get('/progress', (req, res) => {
    const userId = currentUser(req);
    const today = todayFrom(req.query.today);
    const { days } = parse(rangeSchema, req.query);
    const from = addDays(today, -(days - 1));

    const symptoms = db
      .prepare(
        `SELECT local_date AS date, AVG(pain) AS pain, AVG(numbness) AS numbness, AVG(tingling) AS tingling,
                AVG(night_waking) AS nightWaking, AVG(grip_strength_kg) AS gripStrengthKg
         FROM symptom_logs WHERE user_id = ? AND local_date BETWEEN ? AND ?
         GROUP BY local_date ORDER BY local_date`,
      )
      .all(userId, from, today) as Record<string, number | string | null>[];

    const sessionRows = db
      .prepare(
        `SELECT local_date AS date, COUNT(*) AS sessions, SUM(duration_seconds) AS seconds,
                AVG(pain_before) AS painBefore, AVG(pain_after) AS painAfter
         FROM sessions WHERE user_id = ? AND local_date BETWEEN ? AND ?
         GROUP BY local_date`,
      )
      .all(userId, from, today) as { date: string; sessions: number; seconds: number; painBefore: number; painAfter: number }[];
    const byDate = new Map(sessionRows.map((r) => [r.date, r]));

    const assessments = db
      .prepare(
        `SELECT local_date AS date, score FROM assessments
         WHERE user_id = ? AND local_date BETWEEN ? AND ? ORDER BY taken_at`,
      )
      .all(userId, from, today) as { date: string; score: number }[];

    const allDates = (
      db.prepare('SELECT DISTINCT local_date AS d FROM sessions WHERE user_id = ?').all(userId) as { d: string }[]
    ).map((r) => r.d);

    const totals = db
      .prepare(
        `SELECT COUNT(*) AS sessions, COALESCE(SUM(duration_seconds), 0) AS seconds,
                AVG(pain_after - pain_before) AS avgPainChange
         FROM sessions WHERE user_id = ? AND local_date BETWEEN ? AND ?`,
      )
      .get(userId, from, today) as { sessions: number; seconds: number; avgPainChange: number | null };

    res.json({
      from,
      to: today,
      days,
      symptoms: symptoms.map((s) => ({
        date: s.date,
        pain: round1(s.pain as number),
        numbness: round1(s.numbness as number),
        tingling: round1(s.tingling as number),
        nightWaking: round1(s.nightWaking as number),
        gripStrengthKg: round1(s.gripStrengthKg as number | null),
      })),
      activity: Array.from({ length: days }, (_, i) => {
        const date = addDays(from, i);
        const row = byDate.get(date);
        return {
          date,
          sessions: row?.sessions ?? 0,
          minutes: row ? Math.round(row.seconds / 60) : 0,
          painBefore: round1(row?.painBefore ?? null),
          painAfter: round1(row?.painAfter ?? null),
        };
      }),
      assessments: assessments.map((a) => ({ ...a, band: severityBand(a.score) })),
      totals: {
        sessions: totals.sessions,
        minutes: Math.round(totals.seconds / 60),
        activeDays: sessionRows.length,
        avgPainChange: round1(totals.avgPainChange),
        currentStreak: currentStreak(allDates, today),
        longestStreak: longestStreak(allDates),
      },
    });
  });

  return router;
}
