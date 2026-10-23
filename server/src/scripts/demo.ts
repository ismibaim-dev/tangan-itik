// Adds a demo account with four weeks of realistic history, so every screen has data to show.
//   Email: demo@gripwise.app   Password: gripwise-demo
import '../env.js';
import { config } from '../config.js';
import { openDatabase } from '../db/index.js';
import { addDays, utcToday } from '../lib/dates.js';
import { hashPassword } from '../services/auth.js';
import { scoreAssessment } from '../services/assessment.js';

const EMAIL = 'demo@gripwise.app';
const PASSWORD = 'gripwise-demo';
const DAYS = 28;

const db = openDatabase(config.databaseFile);
const today = utcToday();
const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)));
// Deterministic wobble so reruns produce the same data.
const wobble = (i: number) => Math.sin(i * 2.3) * 0.8;

db.prepare('DELETE FROM users WHERE email = ?').run(EMAIL);
const passwordHash = await hashPassword(PASSWORD);

db.transaction(() => {
  const userId = Number(
    db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(EMAIL, passwordHash, 'Aina')
      .lastInsertRowid,
  );
  const phase2Start = `${addDays(today, -11)}T08:00:00.000Z`;
  db.prepare(
    `INSERT INTO profiles (user_id, affected_hand, dominant_hand, symptom_duration, goals, reminder_time, phase, phase_started_at, onboarded)
     VALUES (?, 'right', 'right', '3_to_12_months', ?, '20:30', 2, ?, 1)`,
  ).run(userId, JSON.stringify(['Sleep through the night', 'Type without pain']), phase2Start);

  const exerciseIds = (slugs: string[]) =>
    slugs.map((slug) => (db.prepare('SELECT id FROM exercises WHERE slug = ?').get(slug) as { id: number }).id);
  const phase1 = exerciseIds(['median-nerve-glide', 'tendon-glides', 'finger-fan', 'thumb-touches', 'wrist-circles']);
  const phase2 = exerciseIds([
    'median-nerve-glide',
    'tendon-glides',
    'wrist-circles',
    'wrist-flexor-stretch',
    'wrist-extensor-stretch',
    'prayer-stretch',
    'thumb-stretch',
  ]);

  const insertSession = db.prepare(
    `INSERT INTO sessions (user_id, local_date, started_at, completed_at, duration_seconds, phase, pain_before, pain_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertSessionExercise = db.prepare(
    `INSERT INTO session_exercises (session_id, exercise_id, position, sets_completed, reps_completed, skipped)
     VALUES (?, ?, ?, 1, 5, 0)`,
  );
  const insertSymptom = db.prepare(
    `INSERT INTO symptom_logs (user_id, local_date, logged_at, pain, numbness, tingling, night_waking, grip_strength_kg)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (let i = DAYS - 1; i >= 1; i--) {
    const date = addDays(today, -i);
    const progress = (DAYS - i) / DAYS; // 0 → 1 over the month
    const pain = clamp(6.2 - progress * 4 + wobble(i));

    insertSymptom.run(
      userId,
      date,
      `${date}T07:45:00.000Z`,
      pain,
      clamp(5.5 - progress * 3.5 + wobble(i + 1)),
      clamp(6.5 - progress * 4 + wobble(i + 2)),
      Math.max(0, Math.round(3 - progress * 3 + wobble(i))),
      Math.round((14 + progress * 5 + wobble(i)) * 10) / 10,
    );

    if (i % 6 === 3) continue; // a few missed days
    const inPhase2 = i <= 11;
    const ids = inPhase2 ? phase2 : phase1;
    const sessionId = insertSession.run(
      userId,
      date,
      `${date}T12:30:00.000Z`,
      `${date}T12:${inPhase2 ? 41 : 38}:00.000Z`,
      inPhase2 ? 660 : 480,
      inPhase2 ? 2 : 1,
      pain,
      clamp(pain - (i % 3 === 0 ? 0 : 1)),
    ).lastInsertRowid;
    ids.forEach((exerciseId, position) => insertSessionExercise.run(sessionId, exerciseId, position));
  }

  const insertAssessment = db.prepare(
    'INSERT INTO assessments (user_id, local_date, taken_at, answers, score) VALUES (?, ?, ?, ?, ?)',
  );
  const weekly = [
    [4, 3, 3, 3, 3, 3, 3, 4, 4, 3, 3],
    [3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3],
    [3, 2, 2, 3, 2, 3, 2, 3, 3, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2],
  ];
  weekly.forEach((answers, week) => {
    const date = addDays(today, -(DAYS - 1) + week * 7);
    insertAssessment.run(userId, date, `${date}T09:00:00.000Z`, JSON.stringify(answers), scoreAssessment(answers));
  });
})();

db.close();
console.log(`Demo account ready: ${EMAIL} / ${PASSWORD}`);
