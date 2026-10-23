import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addDays } from '../lib/dates';
import { buildCsvExport, csvCell } from './csv';
import { AppError } from './errors';
import * as repo from './repository';
import { migrate } from './schema';
import { seedExercises } from './seed';
import { Db } from './sqlite';

const TODAY = '2026-03-10';

let SQL: SqlJsStatic;
let db: Db;

function openDb(bytes?: Uint8Array): Db {
  const opened = new Db(new SQL.Database(bytes));
  migrate(opened);
  seedExercises(opened);
  return opened;
}

function onboard(overrides: Partial<repo.OnboardingInput> = {}) {
  return repo.createProfile(db, {
    name: 'Sam',
    affectedHand: 'right',
    dominantHand: 'right',
    symptomDuration: null,
    postSurgery: false,
    goals: [],
    reminderTime: null,
    ...overrides,
  });
}

function routineIds(painNow: number | null = null) {
  return repo.getRoutine(db, TODAY, painNow).exercises.map((e) => e.id);
}

function logSession(localDate: string, painBefore = 3, painAfter = 2) {
  return repo.saveSession(db, {
    localDate,
    startedAt: `${localDate}T10:00:00.000Z`,
    durationSeconds: 420,
    painBefore,
    painAfter,
    exercises: routineIds().map((exerciseId) => ({ exerciseId, setsCompleted: 1, repsCompleted: 5, skipped: false })),
  });
}

const count = (table: string) => db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`)!.n;

beforeAll(async () => {
  SQL = await initSqlJs();
});

beforeEach(() => {
  db = openDb();
});

describe('profile', () => {
  it('has no account until onboarding, then stores the answers', () => {
    expect(repo.getAccount(db)).toBeNull();
    const account = onboard({
      name: '  Samira ',
      affectedHand: 'both',
      dominantHand: 'left',
      symptomDuration: 'over_12_months',
      postSurgery: true,
      goals: ['Sleep through the night'],
      reminderTime: '19:45',
    });
    expect(account.user.name).toBe('Samira');
    expect(account.profile).toMatchObject({
      affectedHand: 'both',
      dominantHand: 'left',
      symptomDuration: 'over_12_months',
      postSurgery: true,
      goals: ['Sleep through the night'],
      reminderTime: '19:45',
      phase: 1,
    });
  });

  it('allows only one profile per device', () => {
    onboard();
    expect(() => onboard({ name: 'Other' })).toThrow(/already exists/);
  });

  it('validates onboarding and updates', () => {
    expect(() => onboard({ name: '   ' })).toThrow('Tell us your name');
    onboard();
    expect(() => repo.updateProfile(db, { reminderTime: '25:00' })).toThrow(/HH:MM/);
    expect(() => repo.updateProfile(db, { phase: 3 } as never)).toThrow(AppError);
    const updated = repo.updateProfile(db, { name: 'Sammy', postSurgery: true, goals: ['Stronger grip'] });
    expect(updated.user.name).toBe('Sammy');
    expect(updated.profile).toMatchObject({ postSurgery: true, goals: ['Stronger grip'], affectedHand: 'right' });
  });

  it('requires a profile before using the programme', () => {
    expect(() => repo.getDashboard(db, TODAY)).toThrow('Set up your profile first');
  });
});

describe('exercises and routine', () => {
  beforeEach(() => onboard());

  it('lists the library with phase locks', () => {
    const { currentPhase, exercises } = repo.getExercises(db);
    expect(currentPhase).toBe(1);
    expect(exercises.length).toBeGreaterThanOrEqual(12);
    expect(exercises.filter((e) => !e.unlocked).every((e) => e.phase > 1)).toBe(true);
    expect(repo.getExercise(db, 'tendon-glides').steps.length).toBeGreaterThan(3);
    expect(() => repo.getExercise(db, 'nope')).toThrow('Exercise not found');
  });

  it('switches to the gentle routine when pain is high', () => {
    const normal = repo.getRoutine(db, TODAY, null);
    expect(normal).toMatchObject({ phase: 1, flareMode: false });
    expect(normal.exercises).toHaveLength(5);

    const flare = repo.getRoutine(db, TODAY, 8);
    expect(flare.flareMode).toBe(true);
    expect(flare.exercises.map((e) => e.category)).not.toContain('strength');
    expect(flare.exercises.length).toBeLessThan(normal.exercises.length);

    // A high symptom log also triggers the gentle routine.
    repo.logSymptoms(db, { localDate: TODAY, pain: 8, numbness: 4, tingling: 5 });
    expect(repo.getRoutine(db, TODAY, null).flareMode).toBe(true);
  });
});

describe('sessions', () => {
  beforeEach(() => onboard());

  it('records a session with feedback on pain change', () => {
    const eased = logSession(TODAY, 5, 3);
    expect(eased.session).toMatchObject({ painBefore: 5, painAfter: 3, phase: 1, exerciseCount: 5, completedCount: 5 });
    expect(eased.feedback.tone).toBe('positive');
    expect(logSession(TODAY, 2, 5).feedback.tone).toBe('warning');
    expect(repo.listSessions(db)).toHaveLength(2);
  });

  it('rejects invalid sessions and leaves nothing behind', () => {
    const base = { localDate: TODAY, startedAt: `${TODAY}T10:00:00.000Z`, durationSeconds: 60, painBefore: 2, painAfter: 2 };
    expect(() =>
      repo.saveSession(db, {
        ...base,
        exercises: [{ exerciseId: 9999, setsCompleted: 1, repsCompleted: 5, skipped: false }],
      }),
    ).toThrow('unknown exercise');
    const [id] = routineIds();
    expect(() =>
      repo.saveSession(db, {
        ...base,
        exercises: [{ exerciseId: id!, setsCompleted: 0, repsCompleted: 0, skipped: true }],
      }),
    ).toThrow('Complete at least one exercise');
    expect(() => repo.saveSession(db, { ...base, painBefore: 11, exercises: [] })).toThrow(AppError);
    expect(count('sessions')).toBe(0);
    expect(count('session_exercises')).toBe(0);
  });
});

describe('phase progression', () => {
  beforeEach(() => onboard());

  it('unlocks the next phase only once the criteria are met', () => {
    expect(() => repo.changePhase(db, 2, TODAY)).toThrow('Not ready');

    for (let i = 5; i >= 0; i--) logSession(addDays(TODAY, -i), 2, 1);
    expect(repo.getPhaseProgress(db, TODAY)).toMatchObject({
      phase: 1,
      sessionsInPhase: 6,
      eligible: true,
      next: { phase: 2 },
    });

    expect(() => repo.changePhase(db, 3, TODAY)).toThrow('one at a time');
    expect(repo.changePhase(db, 2, TODAY).profile.phase).toBe(2);

    // The new phase starts its own count, and its routine adds stretches.
    expect(repo.getPhaseProgress(db, TODAY)).toMatchObject({ phase: 2, sessionsInPhase: 0, eligible: false });
    expect(repo.getRoutine(db, TODAY, null).exercises.some((e) => e.category === 'stretch')).toBe(true);

    // Stepping back is always allowed.
    expect(repo.changePhase(db, 1, TODAY).profile.phase).toBe(1);
  });

  it('holds progression when sessions flare symptoms', () => {
    for (let i = 5; i >= 1; i--) logSession(addDays(TODAY, -i), 2, 1);
    logSession(TODAY, 2, 5);
    const progress = repo.getPhaseProgress(db, TODAY);
    expect(progress.eligible).toBe(false);
    expect(progress.criteria.find((c) => c.key === 'flares')!.met).toBe(false);
  });
});

describe('symptoms', () => {
  beforeEach(() => onboard());

  it('logs, lists and deletes entries', () => {
    const created = repo.logSymptoms(db, {
      localDate: TODAY,
      pain: 4,
      numbness: 3,
      tingling: 5,
      nightWaking: 2,
      gripStrengthKg: 18.5,
      notes: 'Typed a lot',
    });
    expect(created).toMatchObject({ pain: 4, gripStrengthKg: 18.5, nightWaking: 2, notes: 'Typed a lot' });
    expect(repo.listSymptomLogs(db)).toHaveLength(1);
    repo.deleteSymptomLog(db, created.id);
    expect(repo.listSymptomLogs(db)).toHaveLength(0);
    expect(() => repo.deleteSymptomLog(db, created.id)).toThrow('Log not found');
  });

  it('validates scores and dates', () => {
    expect(() => repo.logSymptoms(db, { localDate: TODAY, pain: 12, numbness: 0, tingling: 0 })).toThrow(AppError);
    expect(() => repo.logSymptoms(db, { localDate: '10/03/2026', pain: 1, numbness: 0, tingling: 0 })).toThrow(
      'YYYY-MM-DD',
    );
  });
});

describe('weekly symptom check', () => {
  beforeEach(() => onboard());

  it('scores answers and compares with the previous check', () => {
    expect(repo.assessmentQuestions).toHaveLength(11);
    expect(() => repo.submitAssessment(db, { localDate: TODAY, answers: [1, 2, 3] })).toThrow('Answer all 11');

    const first = repo.submitAssessment(db, { localDate: addDays(TODAY, -7), answers: Array(11).fill(3) });
    expect(first.assessment).toMatchObject({ score: 3, band: 'Severe' });
    expect(first.previous).toBeNull();

    const second = repo.submitAssessment(db, { localDate: TODAY, answers: [2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1] });
    expect(second.assessment.score).toBeCloseTo(1.82, 2);
    expect(second.assessment.band).toBe('Mild');
    expect(second.previous!.score).toBe(3);
  });
});

describe('dashboard and progress', () => {
  beforeEach(() => onboard());

  it('builds the dashboard with streak and week view', () => {
    for (const offset of [-3, -2, -1, 0]) logSession(addDays(TODAY, offset));
    logSession(addDays(TODAY, -6));

    const dashboard = repo.getDashboard(db, TODAY);
    expect(dashboard).toMatchObject({ name: 'Sam', today: TODAY, streak: 4, todaySessions: 1, assessmentDue: true });
    expect(dashboard.week.map((d) => d.done)).toEqual([true, false, false, true, true, true, true]);
    expect(dashboard.routine).toMatchObject({ exerciseCount: 5, flareMode: false });
    expect(dashboard.phase.sessionsInPhase).toBe(5);
  });

  it('keeps yesterday’s streak alive until today ends', () => {
    logSession(addDays(TODAY, -2));
    logSession(addDays(TODAY, -1));
    expect(repo.getDashboard(db, TODAY).streak).toBe(2);
  });

  it('summarises progress over a date range', () => {
    logSession(addDays(TODAY, -40), 3, 2); // outside the range
    logSession(addDays(TODAY, -1), 4, 2);
    logSession(TODAY, 3, 3);
    repo.logSymptoms(db, { localDate: TODAY, pain: 2, numbness: 1, tingling: 3, gripStrengthKg: 20 });
    repo.logSymptoms(db, { localDate: TODAY, pain: 4, numbness: 1, tingling: 1, gripStrengthKg: 22 });

    const report = repo.getProgress(db, TODAY, 30);
    expect(report.activity).toHaveLength(30);
    expect(report.activity.at(-1)).toMatchObject({ date: TODAY, sessions: 1 });
    expect(report.symptoms).toEqual([
      { date: TODAY, pain: 3, numbness: 1, tingling: 2, nightWaking: 0, gripStrengthKg: 21 },
    ]);
    expect(report.totals).toMatchObject({ sessions: 2, activeDays: 2, avgPainChange: -1, currentStreak: 2 });
  });
});

describe('on-device persistence', () => {
  it('survives a save and reopen, without duplicating the exercise library', () => {
    onboard({ reminderTime: '08:15' });
    logSession(TODAY, 4, 2);
    repo.logSymptoms(db, { localDate: TODAY, pain: 2, numbness: 1, tingling: 1 });
    const exercises = count('exercises');

    const bytes = db.export();
    // Pragmas reset when sql.js exports; foreign keys must still be enforced afterwards.
    expect(db.get<{ foreign_keys: number }>('PRAGMA foreign_keys')!.foreign_keys).toBe(1);

    db = openDb(bytes);
    expect(repo.getAccount(db)!.profile.reminderTime).toBe('08:15');
    expect(repo.listSessions(db)).toHaveLength(1);
    expect(repo.listSymptomLogs(db)).toHaveLength(1);
    expect(count('exercises')).toBe(exercises);
  });
});

describe('CSV export', () => {
  it('quotes cells and neutralises spreadsheet formulas', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(3.5)).toBe('3.5');
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a, "quoted"\nline')).toBe('"a, ""quoted""\nline"');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('-2 after typing')).toBe("'-2 after typing");
  });

  it('exports every table with headers and one row per record', () => {
    onboard({ goals: ['Type without pain', 'Stronger grip'] });
    logSession(TODAY, 4, 2);
    repo.logSymptoms(db, { localDate: TODAY, pain: 2, numbness: 1, tingling: 1, notes: 'Wore splint, slept well' });
    repo.submitAssessment(db, { localDate: TODAY, answers: Array(11).fill(2) });

    const files = buildCsvExport(db, TODAY);
    expect(files.map((f) => [f.filename, f.rows])).toEqual([
      ['gripwise-profile-2026-03-10.csv', 1],
      ['gripwise-sessions-2026-03-10.csv', 1],
      ['gripwise-session-exercises-2026-03-10.csv', 5],
      ['gripwise-symptom-logs-2026-03-10.csv', 1],
      ['gripwise-weekly-checks-2026-03-10.csv', 1],
    ]);

    const lines = (name: string) => files.find((f) => f.filename.includes(name))!.content.replace('﻿', '').trim().split('\r\n');
    expect(lines('profile')[1]).toContain('Type without pain; Stronger grip');
    expect(lines('sessions')[0]).toBe(
      'session_id,date,started_at_utc,completed_at_utc,duration_seconds,phase,gentle_routine,pain_before,pain_after,pain_change,exercises_done,exercises_total,notes',
    );
    expect(lines('sessions')[1]).toMatch(/^1,2026-03-10,2026-03-10T10:00:00.000Z,.*,420,1,no,4,2,-2,5,5,$/);
    expect(lines('session-exercises')[1]).toBe('1,2026-03-10,1,Median nerve glide,nerve_glide,1,5,no');
    expect(lines('symptom-logs')[1]).toMatch(/,2,1,1,0,,"Wore splint, slept well"$/);
    expect(lines('weekly-checks')[1]).toMatch(/,2,Moderate,2,2,2,2,2,2,2,2,2,2,2$/);
    expect(files.every((f) => f.content.startsWith('﻿'))).toBe(true);
  });
});
