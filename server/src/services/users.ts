import type { DB } from '../db/index.js';
import type { Phase } from './program.js';

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface Profile {
  affectedHand: 'left' | 'right' | 'both';
  dominantHand: 'left' | 'right';
  symptomDuration: 'under_3_months' | '3_to_12_months' | 'over_12_months' | null;
  postSurgery: boolean;
  goals: string[];
  reminderTime: string | null;
  phase: Phase;
  phaseStartedAt: string;
  onboarded: boolean;
}

interface ProfileRow {
  affected_hand: Profile['affectedHand'];
  dominant_hand: Profile['dominantHand'];
  symptom_duration: Profile['symptomDuration'];
  post_surgery: number;
  goals: string;
  reminder_time: string | null;
  phase: Phase;
  phase_started_at: string;
  onboarded: number;
}

export function getUser(db: DB, userId: number): User {
  return db
    .prepare('SELECT id, email, name, created_at AS createdAt FROM users WHERE id = ?')
    .get(userId) as User;
}

export function getProfile(db: DB, userId: number): Profile {
  const row = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as ProfileRow;
  return {
    affectedHand: row.affected_hand,
    dominantHand: row.dominant_hand,
    symptomDuration: row.symptom_duration,
    postSurgery: row.post_surgery === 1,
    goals: JSON.parse(row.goals) as string[],
    reminderTime: row.reminder_time,
    phase: row.phase,
    phaseStartedAt: row.phase_started_at,
    onboarded: row.onboarded === 1,
  };
}

export function getAccount(db: DB, userId: number) {
  return { user: getUser(db, userId), profile: getProfile(db, userId) };
}
