// Rehab programme rules: which exercises make up today's routine, when to drop to a
// gentle "flare-up" routine, and when the user is ready for the next phase.
import { addDays } from '../lib/dates';
import { exercisesBySlug } from './library';
import type { Db } from './sqlite';
import type { Exercise, Feedback, Phase, PhaseProgress, Routine } from './types';

export const PHASES: Record<Phase, { name: string; focus: string }> = {
  1: { name: 'Calm & glide', focus: 'Settle symptoms and keep the nerve and tendons moving freely.' },
  2: { name: 'Restore flexibility', focus: 'Add gentle stretches to loosen the wrist and forearm.' },
  3: { name: 'Rebuild strength', focus: 'Light grip and pinch work so everyday tasks feel easier.' },
};

/** Exercises in each phase's daily routine, in the order they are performed. */
const ROUTINES: Record<Phase, string[]> = {
  1: ['median-nerve-glide', 'tendon-glides', 'finger-fan', 'thumb-touches', 'wrist-circles'],
  2: [
    'median-nerve-glide',
    'tendon-glides',
    'wrist-circles',
    'wrist-flexor-stretch',
    'wrist-extensor-stretch',
    'prayer-stretch',
    'thumb-stretch',
  ],
  3: [
    'median-nerve-glide',
    'tendon-glides',
    'wrist-flexor-stretch',
    'wrist-extensor-stretch',
    'putty-grip',
    'pinch-strengthening',
    'finger-extension-band',
    'wrist-curls',
  ],
};

/** Used instead of the phase routine when pain is high: gliding only, no stretching or loading. */
const FLARE_ROUTINE = ['median-nerve-glide', 'tendon-glides', 'finger-fan'];

export const FLARE_PAIN = 7;
export const ADVANCE_RULES = {
  sessionsRequired: 6,
  maxAveragePain: 3,
  painWindowDays: 7,
  /** A session where pain rose by this much or more counts as a flare-up. */
  flareRise: 2,
  flareLookback: 5,
};

/** Seconds a relaxed pause lasts between reps in the guided player. */
export const RELAX_SECONDS = 3;

export function estimateSeconds(exercises: Exercise[]): number {
  return exercises.reduce((total, ex) => {
    const work = ex.sets * ex.reps * (ex.holdSeconds + RELAX_SECONDS);
    return total + work + (ex.sets - 1) * ex.restSeconds + 10;
  }, 0);
}

export function buildRoutine(db: Db, phase: Phase, flareMode: boolean): Omit<Routine, 'painReference'> {
  const exercises = exercisesBySlug(db, flareMode ? FLARE_ROUTINE : ROUTINES[phase]);
  return {
    phase,
    flareMode,
    exercises,
    estimatedMinutes: Math.max(1, Math.round(estimateSeconds(exercises) / 60)),
  };
}

/** Most recent pain score from either a symptom log or a session start, within the last two days. */
export function latestPain(db: Db, today: string): number | null {
  const row = db.get<{ pain: number }>(
    `SELECT pain FROM (
       SELECT pain, logged_at AS at, local_date FROM symptom_logs
       UNION ALL
       SELECT pain_before AS pain, started_at AS at, local_date FROM sessions
     )
     WHERE local_date >= ?
     ORDER BY at DESC
     LIMIT 1`,
    addDays(today, -1),
  );
  return row?.pain ?? null;
}

export function phaseProgress(db: Db, phase: Phase, phaseStartedAt: string, today: string): PhaseProgress {
  const { sessionsInPhase } = db.get<{ sessionsInPhase: number }>(
    'SELECT COUNT(*) AS sessionsInPhase FROM sessions WHERE phase = ? AND completed_at >= ?',
    phase,
    phaseStartedAt,
  )!;

  const since = addDays(today, -(ADVANCE_RULES.painWindowDays - 1));
  const { averagePain } = db.get<{ averagePain: number | null }>(
    `SELECT AVG(pain) AS averagePain FROM (
       SELECT pain FROM symptom_logs WHERE local_date >= ?
       UNION ALL
       SELECT pain_before FROM sessions WHERE local_date >= ?
     )`,
    since,
    since,
  )!;

  const recent = db.all<{ pain_before: number; pain_after: number }>(
    `SELECT pain_before, pain_after FROM sessions
     WHERE phase = ? AND completed_at >= ?
     ORDER BY completed_at DESC LIMIT ?`,
    phase,
    phaseStartedAt,
    ADVANCE_RULES.flareLookback,
  );
  const recentFlareUps = recent.filter((s) => s.pain_after - s.pain_before >= ADVANCE_RULES.flareRise).length;

  const nextPhase = phase < 3 ? ((phase + 1) as Phase) : null;
  const criteria = [
    {
      key: 'sessions',
      label: `Complete ${ADVANCE_RULES.sessionsRequired} sessions in this phase`,
      met: sessionsInPhase >= ADVANCE_RULES.sessionsRequired,
    },
    {
      key: 'pain',
      label: `Average pain of ${ADVANCE_RULES.maxAveragePain}/10 or less over ${ADVANCE_RULES.painWindowDays} days`,
      met: averagePain !== null && averagePain <= ADVANCE_RULES.maxAveragePain,
    },
    {
      key: 'flares',
      label: 'No sessions that made pain worse recently',
      met: recentFlareUps === 0,
    },
  ];

  return {
    phase,
    ...PHASES[phase],
    next: nextPhase ? { phase: nextPhase, name: PHASES[nextPhase].name } : null,
    sessionsInPhase,
    sessionsRequired: ADVANCE_RULES.sessionsRequired,
    averagePain: averagePain === null ? null : Math.round(averagePain * 10) / 10,
    recentFlareUps,
    criteria,
    eligible: nextPhase !== null && criteria.every((c) => c.met),
  };
}

/** What to tell the user after a session, based on how their pain changed. */
export function sessionFeedback(painBefore: number, painAfter: number): Feedback {
  const change = painAfter - painBefore;
  if (painAfter >= FLARE_PAIN) {
    return {
      tone: 'warning',
      title: 'Take it easy today',
      message:
        'Your pain is high. Rest the hand and avoid repetitive gripping. If pain is severe, or numbness or weakness is getting worse, contact your doctor or physiotherapist.',
    };
  }
  if (change >= ADVANCE_RULES.flareRise) {
    return {
      tone: 'warning',
      title: `Pain went up ${change} points`,
      message:
        'Next time move more gently and ease off the holds. If it is still raised in a couple of hours, rest and check in with your clinician.',
    };
  }
  if (change < 0) {
    return {
      tone: 'positive',
      title: `Pain eased by ${-change} ${change === -1 ? 'point' : 'points'}`,
      message: 'That is a good sign the routine suits you. Keep the movements smooth and unhurried.',
    };
  }
  return {
    tone: 'neutral',
    title: 'Symptoms held steady',
    message: 'Steady is good. Consistency matters more than intensity, so aim for a little every day.',
  };
}
