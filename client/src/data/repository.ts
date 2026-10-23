// Everything the app reads and writes. Each function takes the open database;
// data/store.ts binds them to the on-device database and saves it after writes.
import { z } from 'zod';
import { addDays, currentStreak, longestStreak } from '../lib/dates';
import { ASSESSMENT_QUESTIONS, scoreAssessment, severityBand } from './assessment';
import { AppError, parse } from './errors';
import { findExercise, listExercises } from './library';
import { buildRoutine, FLARE_PAIN, latestPain, phaseProgress, sessionFeedback } from './program';
import type { Db } from './sqlite';
import type {
  Account,
  Assessment,
  Dashboard,
  Exercise,
  Phase,
  PhaseProgress,
  Profile,
  ProgressReport,
  Routine,
  SessionResult,
  SessionSummary,
  SymptomLog,
} from './types';

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const score = z.number().int().min(0).max(10);
const now = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

// ---------------------------------------------------------------------------
// Profile

const profileFields = {
  name: z.string().trim().min(1, 'Tell us your name').max(80),
  affectedHand: z.enum(['left', 'right', 'both']),
  dominantHand: z.enum(['left', 'right']),
  symptomDuration: z.enum(['under_3_months', '3_to_12_months', 'over_12_months']).nullable(),
  postSurgery: z.boolean(),
  goals: z.array(z.string().trim().min(1).max(60)).max(6),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Reminder time must be HH:MM')
    .nullable(),
};

const onboardingSchema = z.object(profileFields).strict();
const profileUpdateSchema = z.object(profileFields).partial().strict();

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type ProfileUpdate = z.input<typeof profileUpdateSchema>;

const profileColumns = {
  name: 'name',
  affectedHand: 'affected_hand',
  dominantHand: 'dominant_hand',
  symptomDuration: 'symptom_duration',
  postSurgery: 'post_surgery',
  goals: 'goals',
  reminderTime: 'reminder_time',
} as const;

interface ProfileRow {
  name: string;
  affected_hand: Profile['affectedHand'];
  dominant_hand: Profile['dominantHand'];
  symptom_duration: Profile['symptomDuration'];
  post_surgery: number;
  goals: string;
  reminder_time: string | null;
  phase: Phase;
  phase_started_at: string;
  created_at: string;
}

/** The device's profile, or null before onboarding. */
export function getAccount(db: Db): Account | null {
  const row = db.get<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  if (!row) return null;
  return {
    user: { name: row.name, createdAt: row.created_at },
    profile: {
      affectedHand: row.affected_hand,
      dominantHand: row.dominant_hand,
      symptomDuration: row.symptom_duration,
      postSurgery: row.post_surgery === 1,
      goals: JSON.parse(row.goals) as string[],
      reminderTime: row.reminder_time,
      phase: row.phase,
      phaseStartedAt: row.phase_started_at,
    },
  };
}

function requireAccount(db: Db): Account {
  const account = getAccount(db);
  if (!account) throw new AppError('Set up your profile first');
  return account;
}

export function createProfile(db: Db, input: OnboardingInput): Account {
  const body = parse(onboardingSchema, input);
  if (getAccount(db)) throw new AppError('A profile already exists on this device');
  db.run(
    `INSERT INTO profile (id, name, affected_hand, dominant_hand, symptom_duration, post_surgery, goals, reminder_time)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    body.name,
    body.affectedHand,
    body.dominantHand,
    body.symptomDuration,
    Number(body.postSurgery),
    JSON.stringify(body.goals),
    body.reminderTime,
  );
  return requireAccount(db);
}

export function updateProfile(db: Db, input: ProfileUpdate): Account {
  requireAccount(db);
  const fields = parse(profileUpdateSchema, input);
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    sets.push(`${profileColumns[key as keyof typeof profileColumns]} = ?`);
    values.push(typeof value === 'boolean' ? Number(value) : Array.isArray(value) ? JSON.stringify(value) : value);
  }
  if (sets.length > 0) db.run(`UPDATE profile SET ${sets.join(', ')}, updated_at = ${now} WHERE id = 1`, ...values);
  return requireAccount(db);
}

// ---------------------------------------------------------------------------
// Exercises and programme

export function getExercises(db: Db): { currentPhase: Phase; exercises: Exercise[] } {
  const { phase } = requireAccount(db).profile;
  return {
    currentPhase: phase,
    exercises: listExercises(db).map((ex) => ({ ...ex, unlocked: ex.phase <= phase })),
  };
}

export function getExercise(db: Db, slug: string): Exercise {
  const exercise = findExercise(db, slug);
  if (!exercise) throw new AppError('Exercise not found');
  return { ...exercise, unlocked: exercise.phase <= requireAccount(db).profile.phase };
}

/** Today's routine. painNow comes from the pre-session check; otherwise the latest recorded pain is used. */
export function getRoutine(db: Db, today: string, painNow: number | null): Routine {
  const day = parse(localDate, today);
  const pain = painNow === null ? latestPain(db, day) : parse(score, painNow);
  const { phase } = requireAccount(db).profile;
  return { ...buildRoutine(db, phase, pain !== null && pain >= FLARE_PAIN), painReference: pain };
}

export function getPhaseProgress(db: Db, today: string): PhaseProgress {
  const { phase, phaseStartedAt } = requireAccount(db).profile;
  return phaseProgress(db, phase, phaseStartedAt, parse(localDate, today));
}

/** Move up one phase once the criteria are met, or step back to an earlier phase at any time. */
export function changePhase(db: Db, target: Phase, today: string): Account {
  const { phase, phaseStartedAt } = requireAccount(db).profile;
  if (![1, 2, 3].includes(target)) throw new AppError('Unknown phase');
  if (target === phase) throw new AppError(`You are already in phase ${phase}`);
  if (target > phase) {
    if (target !== phase + 1) throw new AppError('Phases unlock one at a time');
    const progress = phaseProgress(db, phase, phaseStartedAt, parse(localDate, today));
    if (!progress.eligible) throw new AppError('Not ready for the next phase yet', progress.criteria);
  }
  db.run(`UPDATE profile SET phase = ?, phase_started_at = ${now}, updated_at = ${now} WHERE id = 1`, target);
  return requireAccount(db);
}

// ---------------------------------------------------------------------------
// Sessions

const sessionSchema = z.object({
  localDate,
  startedAt: z.iso.datetime(),
  durationSeconds: z.number().int().min(0).max(4 * 60 * 60),
  painBefore: score,
  painAfter: score,
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

export type SessionInput = z.input<typeof sessionSchema>;

interface SessionRow {
  id: number;
  local_date: string;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  phase: Phase;
  flare_mode: number;
  pain_before: number;
  pain_after: number;
  notes: string | null;
  exercise_count: number;
  completed_count: number;
}

function toSession(row: SessionRow): SessionSummary {
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

export function saveSession(db: Db, input: SessionInput): SessionResult {
  const body = parse(sessionSchema, input);
  const { phase, phaseStartedAt } = requireAccount(db).profile;

  const ids = [...new Set(body.exercises.map((e) => e.exerciseId))];
  const { found } = db.get<{ found: number }>(
    `SELECT COUNT(*) AS found FROM exercises WHERE id IN (${ids.map(() => '?').join(',')})`,
    ...ids,
  )!;
  if (found !== ids.length) throw new AppError('Session includes an unknown exercise');
  if (body.exercises.every((e) => e.skipped)) throw new AppError('Complete at least one exercise to log a session');

  const sessionId = db.transaction(() => {
    const { lastInsertRowid } = db.run(
      `INSERT INTO sessions (local_date, started_at, duration_seconds, phase, flare_mode, pain_before, pain_after, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      body.localDate,
      body.startedAt,
      body.durationSeconds,
      phase,
      Number(body.flareMode),
      body.painBefore,
      body.painAfter,
      body.notes || null,
    );
    body.exercises.forEach((e, position) =>
      db.run(
        `INSERT INTO session_exercises (session_id, exercise_id, position, sets_completed, reps_completed, skipped)
         VALUES (?, ?, ?, ?, ?, ?)`,
        lastInsertRowid,
        e.exerciseId,
        position,
        e.setsCompleted,
        e.repsCompleted,
        Number(e.skipped),
      ),
    );
    return lastInsertRowid;
  });

  return {
    session: toSession(db.get<SessionRow>(`${sessionSelect} WHERE s.id = ? GROUP BY s.id`, sessionId)!),
    feedback: sessionFeedback(body.painBefore, body.painAfter),
    progress: phaseProgress(db, phase, phaseStartedAt, body.localDate),
  };
}

export function listSessions(db: Db, limit = 20): SessionSummary[] {
  return db
    .all<SessionRow>(`${sessionSelect} GROUP BY s.id ORDER BY s.completed_at DESC, s.id DESC LIMIT ?`, limit)
    .map(toSession);
}

// ---------------------------------------------------------------------------
// Symptom logs

const symptomSchema = z.object({
  localDate,
  pain: score,
  numbness: score,
  tingling: score,
  nightWaking: z.number().int().min(0).max(10).default(0),
  gripStrengthKg: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type SymptomInput = z.input<typeof symptomSchema>;

const symptomSelect = `
  SELECT id, local_date AS localDate, logged_at AS loggedAt, pain, numbness, tingling,
         night_waking AS nightWaking, grip_strength_kg AS gripStrengthKg, notes
  FROM symptom_logs
`;

export function logSymptoms(db: Db, input: SymptomInput): SymptomLog {
  const body = parse(symptomSchema, input);
  const { lastInsertRowid } = db.run(
    `INSERT INTO symptom_logs (local_date, pain, numbness, tingling, night_waking, grip_strength_kg, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    body.localDate,
    body.pain,
    body.numbness,
    body.tingling,
    body.nightWaking,
    body.gripStrengthKg ?? null,
    body.notes || null,
  );
  return db.get<SymptomLog>(`${symptomSelect} WHERE id = ?`, lastInsertRowid)!;
}

export function listSymptomLogs(db: Db, limit = 30): SymptomLog[] {
  return db.all<SymptomLog>(`${symptomSelect} ORDER BY logged_at DESC, id DESC LIMIT ?`, limit);
}

export function deleteSymptomLog(db: Db, id: number): void {
  const { changes } = db.run('DELETE FROM symptom_logs WHERE id = ?', id);
  if (changes === 0) throw new AppError('Log not found');
}

// ---------------------------------------------------------------------------
// Weekly symptom check

export const assessmentQuestions = ASSESSMENT_QUESTIONS;

const assessmentSchema = z.object({
  localDate,
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

function toAssessment(row: AssessmentRow): Assessment {
  return { ...row, answers: JSON.parse(row.answers) as number[], band: severityBand(row.score) };
}

const assessmentSelect = 'SELECT id, local_date AS localDate, taken_at AS takenAt, answers, score FROM assessments';

export function submitAssessment(
  db: Db,
  input: z.input<typeof assessmentSchema>,
): { assessment: Assessment; previous: Assessment | null } {
  const body = parse(assessmentSchema, input);
  const { lastInsertRowid } = db.run(
    'INSERT INTO assessments (local_date, answers, score) VALUES (?, ?, ?)',
    body.localDate,
    JSON.stringify(body.answers),
    scoreAssessment(body.answers),
  );
  const current = db.get<AssessmentRow>(`${assessmentSelect} WHERE id = ?`, lastInsertRowid)!;
  const previous = db.get<AssessmentRow>(`${assessmentSelect} WHERE id < ? ORDER BY id DESC LIMIT 1`, lastInsertRowid);
  return { assessment: toAssessment(current), previous: previous ? toAssessment(previous) : null };
}

export function listAssessments(db: Db): Assessment[] {
  return db.all<AssessmentRow>(`${assessmentSelect} ORDER BY taken_at DESC, id DESC`).map(toAssessment);
}

// ---------------------------------------------------------------------------
// Dashboard and progress

const round1 = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

function sessionDates(db: Db): string[] {
  return db.all<{ d: string }>('SELECT DISTINCT local_date AS d FROM sessions').map((r) => r.d);
}

export function getDashboard(db: Db, today: string): Dashboard {
  const day = parse(localDate, today);
  const { user, profile } = requireAccount(db);
  const active = new Set(sessionDates(db));

  const { todaySessions } = db.get<{ todaySessions: number }>(
    'SELECT COUNT(*) AS todaySessions FROM sessions WHERE local_date = ?',
    day,
  )!;
  const latestSymptom = db.get<NonNullable<Dashboard['latestSymptom']>>(
    `SELECT local_date AS localDate, pain, numbness, tingling
     FROM symptom_logs ORDER BY logged_at DESC, id DESC LIMIT 1`,
  );
  const lastAssessment = db.get<{ localDate: string; score: number }>(
    'SELECT local_date AS localDate, score FROM assessments ORDER BY taken_at DESC, id DESC LIMIT 1',
  );

  const pain = latestPain(db, day);
  const routine = buildRoutine(db, profile.phase, pain !== null && pain >= FLARE_PAIN);

  return {
    name: user.name,
    today: day,
    streak: currentStreak(active, day),
    week: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(day, i - 6);
      return { date, done: active.has(date) };
    }),
    todaySessions,
    routine: {
      exerciseCount: routine.exercises.length,
      estimatedMinutes: routine.estimatedMinutes,
      flareMode: routine.flareMode,
    },
    phase: phaseProgress(db, profile.phase, profile.phaseStartedAt, day),
    latestSymptom: latestSymptom ?? null,
    lastAssessment: lastAssessment ? { ...lastAssessment, band: severityBand(lastAssessment.score) } : null,
    assessmentDue: !lastAssessment || lastAssessment.localDate <= addDays(day, -7),
  };
}

export function getProgress(db: Db, today: string, days: number): ProgressReport {
  const to = parse(localDate, today);
  const range = parse(z.number().int().min(7).max(365), days);
  const from = addDays(to, -(range - 1));

  const symptoms = db.all<{
    date: string;
    pain: number;
    numbness: number;
    tingling: number;
    nightWaking: number;
    gripStrengthKg: number | null;
  }>(
    `SELECT local_date AS date, AVG(pain) AS pain, AVG(numbness) AS numbness, AVG(tingling) AS tingling,
            AVG(night_waking) AS nightWaking, AVG(grip_strength_kg) AS gripStrengthKg
     FROM symptom_logs WHERE local_date BETWEEN ? AND ?
     GROUP BY local_date ORDER BY local_date`,
    from,
    to,
  );

  const sessionRows = db.all<{ date: string; sessions: number; seconds: number; painBefore: number; painAfter: number }>(
    `SELECT local_date AS date, COUNT(*) AS sessions, SUM(duration_seconds) AS seconds,
            AVG(pain_before) AS painBefore, AVG(pain_after) AS painAfter
     FROM sessions WHERE local_date BETWEEN ? AND ?
     GROUP BY local_date`,
    from,
    to,
  );
  const byDate = new Map(sessionRows.map((r) => [r.date, r]));

  const assessments = db.all<{ date: string; score: number }>(
    'SELECT local_date AS date, score FROM assessments WHERE local_date BETWEEN ? AND ? ORDER BY taken_at, id',
    from,
    to,
  );

  const totals = db.get<{ sessions: number; seconds: number; avgPainChange: number | null }>(
    `SELECT COUNT(*) AS sessions, COALESCE(SUM(duration_seconds), 0) AS seconds,
            AVG(pain_after - pain_before) AS avgPainChange
     FROM sessions WHERE local_date BETWEEN ? AND ?`,
    from,
    to,
  )!;
  const allDates = sessionDates(db);

  return {
    from,
    to,
    days: range,
    symptoms: symptoms.map((s) => ({
      date: s.date,
      pain: round1(s.pain)!,
      numbness: round1(s.numbness)!,
      tingling: round1(s.tingling)!,
      nightWaking: round1(s.nightWaking)!,
      gripStrengthKg: round1(s.gripStrengthKg),
    })),
    activity: Array.from({ length: range }, (_, i) => {
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
      currentStreak: currentStreak(allDates, to),
      longestStreak: longestStreak(allDates),
    },
  };
}
