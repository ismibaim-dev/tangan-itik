// Response shapes of the GripWise API (see server/src/routes).

export type Hand = 'left' | 'right' | 'both';
export type SymptomDuration = 'under_3_months' | '3_to_12_months' | 'over_12_months';
export type Phase = 1 | 2 | 3;
export type ExerciseCategory = 'nerve_glide' | 'tendon_glide' | 'mobility' | 'stretch' | 'strength';

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface Profile {
  affectedHand: Hand;
  dominantHand: 'left' | 'right';
  symptomDuration: SymptomDuration | null;
  postSurgery: boolean;
  goals: string[];
  reminderTime: string | null;
  phase: Phase;
  phaseStartedAt: string;
  onboarded: boolean;
}

export interface Account {
  user: User;
  profile: Profile;
}

export interface Exercise {
  id: number;
  slug: string;
  name: string;
  category: ExerciseCategory;
  phase: Phase;
  summary: string;
  steps: string[];
  sets: number;
  reps: number;
  holdSeconds: number;
  cue: string;
  restSeconds: number;
  equipment: string | null;
  caution: string | null;
  unlocked?: boolean;
}

export interface Routine {
  phase: Phase;
  flareMode: boolean;
  exercises: Exercise[];
  estimatedMinutes: number;
  painReference: number | null;
}

export interface PhaseProgress {
  phase: Phase;
  name: string;
  focus: string;
  next: { phase: Phase; name: string } | null;
  sessionsInPhase: number;
  sessionsRequired: number;
  averagePain: number | null;
  recentFlareUps: number;
  criteria: { key: string; label: string; met: boolean }[];
  eligible: boolean;
}

export interface Dashboard {
  name: string;
  today: string;
  streak: number;
  week: { date: string; done: boolean }[];
  todaySessions: number;
  routine: { exerciseCount: number; estimatedMinutes: number; flareMode: boolean };
  phase: PhaseProgress;
  latestSymptom: { localDate: string; pain: number; numbness: number; tingling: number } | null;
  lastAssessment: { localDate: string; score: number; band: string } | null;
  assessmentDue: boolean;
}

export interface SessionSummary {
  id: number;
  localDate: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  phase: Phase;
  flareMode: boolean;
  painBefore: number;
  painAfter: number;
  notes: string | null;
  exerciseCount: number;
  completedCount: number;
}

export interface Feedback {
  tone: 'positive' | 'neutral' | 'warning';
  title: string;
  message: string;
}

export interface SessionResult {
  session: SessionSummary;
  feedback: Feedback;
  progress: PhaseProgress;
}

export interface SessionExerciseInput {
  exerciseId: number;
  setsCompleted: number;
  repsCompleted: number;
  skipped: boolean;
}

export interface SymptomLog {
  id: number;
  localDate: string;
  loggedAt: string;
  pain: number;
  numbness: number;
  tingling: number;
  nightWaking: number;
  gripStrengthKg: number | null;
  notes: string | null;
}

export interface Question {
  id: number;
  text: string;
  options: string[];
}

export interface Assessment {
  id: number;
  localDate: string;
  takenAt: string;
  answers: number[];
  score: number;
  band: string;
}

export interface ProgressReport {
  from: string;
  to: string;
  days: number;
  symptoms: {
    date: string;
    pain: number;
    numbness: number;
    tingling: number;
    nightWaking: number;
    gripStrengthKg: number | null;
  }[];
  activity: { date: string; sessions: number; minutes: number; painBefore: number | null; painAfter: number | null }[];
  assessments: { date: string; score: number; band: string }[];
  totals: {
    sessions: number;
    minutes: number;
    activeDays: number;
    avgPainChange: number | null;
    currentStreak: number;
    longestStreak: number;
  };
}
