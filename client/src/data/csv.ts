// CSV export of everything stored on the device: one file per table, UTF-8 with a byte-order
// mark so Excel reads accents and emoji correctly. Timestamps are ISO 8601 in UTC.
import { severityBand } from './assessment';
import type { Db } from './sqlite';

export interface CsvFile {
  filename: string;
  content: string;
  rows: number;
}

type Cell = string | number | null | undefined;

/** One RFC 4180 cell. Text a spreadsheet would run as a formula gets a leading apostrophe. */
export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

const yesNo = (value: number) => (value ? 'yes' : 'no');

/** Column names for the weekly check answers, in question order (see data/assessment.ts). */
const CHECK_COLUMNS = [
  'night_pain',
  'night_pain_waking',
  'day_pain',
  'day_pain_frequency',
  'day_pain_duration',
  'numbness',
  'weakness',
  'tingling',
  'night_numbness_tingling',
  'night_numbness_waking',
  'grip_small_objects',
];

export function buildCsvExport(db: Db, today: string): CsvFile[] {
  const file = (name: string, headers: string[], rows: Cell[][]): CsvFile => ({
    filename: `gripwise-${name}-${today}.csv`,
    content: toCsv(headers, rows),
    rows: rows.length,
  });

  const profile = db.all<{
    name: string;
    affected_hand: string;
    dominant_hand: string;
    symptom_duration: string | null;
    post_surgery: number;
    goals: string;
    reminder_time: string | null;
    phase: number;
    phase_started_at: string;
    created_at: string;
  }>('SELECT * FROM profile');

  const sessions = db.all<{
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
    done: number;
    total: number;
  }>(
    `SELECT s.*, COALESCE(SUM(CASE WHEN se.skipped = 0 THEN 1 ELSE 0 END), 0) AS done, COUNT(se.id) AS total
     FROM sessions s LEFT JOIN session_exercises se ON se.session_id = s.id
     GROUP BY s.id ORDER BY s.started_at, s.id`,
  );

  const sessionExercises = db.all<{
    session_id: number;
    local_date: string;
    position: number;
    name: string;
    category: string;
    sets_completed: number;
    reps_completed: number;
    skipped: number;
  }>(
    `SELECT se.session_id, s.local_date, se.position, e.name, e.category,
            se.sets_completed, se.reps_completed, se.skipped
     FROM session_exercises se
     JOIN sessions s ON s.id = se.session_id
     JOIN exercises e ON e.id = se.exercise_id
     ORDER BY s.started_at, se.session_id, se.position`,
  );

  const symptoms = db.all<{
    id: number;
    local_date: string;
    logged_at: string;
    pain: number;
    numbness: number;
    tingling: number;
    night_waking: number;
    grip_strength_kg: number | null;
    notes: string | null;
  }>('SELECT * FROM symptom_logs ORDER BY logged_at, id');

  const checks = db.all<{ id: number; local_date: string; taken_at: string; score: number; answers: string }>(
    'SELECT * FROM assessments ORDER BY taken_at, id',
  );

  return [
    file(
      'profile',
      [
        'name',
        'affected_hand',
        'dominant_hand',
        'symptom_duration',
        'post_surgery',
        'goals',
        'reminder_time',
        'phase',
        'phase_started_at_utc',
        'created_at_utc',
      ],
      profile.map((p) => [
        p.name,
        p.affected_hand,
        p.dominant_hand,
        p.symptom_duration,
        yesNo(p.post_surgery),
        (JSON.parse(p.goals) as string[]).join('; '),
        p.reminder_time,
        p.phase,
        p.phase_started_at,
        p.created_at,
      ]),
    ),
    file(
      'sessions',
      [
        'session_id',
        'date',
        'started_at_utc',
        'completed_at_utc',
        'duration_seconds',
        'phase',
        'gentle_routine',
        'pain_before',
        'pain_after',
        'pain_change',
        'exercises_done',
        'exercises_total',
        'notes',
      ],
      sessions.map((s) => [
        s.id,
        s.local_date,
        s.started_at,
        s.completed_at,
        s.duration_seconds,
        s.phase,
        yesNo(s.flare_mode),
        s.pain_before,
        s.pain_after,
        s.pain_after - s.pain_before,
        s.done,
        s.total,
        s.notes,
      ]),
    ),
    file(
      'session-exercises',
      ['session_id', 'date', 'order', 'exercise', 'category', 'sets_completed', 'reps_completed', 'skipped'],
      sessionExercises.map((e) => [
        e.session_id,
        e.local_date,
        e.position + 1,
        e.name,
        e.category,
        e.sets_completed,
        e.reps_completed,
        yesNo(e.skipped),
      ]),
    ),
    file(
      'symptom-logs',
      ['log_id', 'date', 'logged_at_utc', 'pain', 'numbness', 'tingling', 'night_waking', 'grip_strength_kg', 'notes'],
      symptoms.map((s) => [
        s.id,
        s.local_date,
        s.logged_at,
        s.pain,
        s.numbness,
        s.tingling,
        s.night_waking,
        s.grip_strength_kg,
        s.notes,
      ]),
    ),
    file(
      'weekly-checks',
      ['check_id', 'date', 'taken_at_utc', 'score', 'severity', ...CHECK_COLUMNS],
      checks.map((c) => [
        c.id,
        c.local_date,
        c.taken_at,
        c.score,
        severityBand(c.score),
        ...(JSON.parse(c.answers) as number[]),
      ]),
    ),
  ];
}
