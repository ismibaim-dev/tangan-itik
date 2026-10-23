import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase, type DB } from '../src/db/index.js';
import { addDays } from '../src/lib/dates.js';

const TODAY = '2026-03-10';

let db: DB;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = openDatabase(':memory:');
  app = createApp(db, { rateLimit: false });
});

async function signUp(email = 'sam@example.com') {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'Sam', email, password: 'correct-horse' }).expect(201);
  return agent;
}

async function exerciseIds(agent: request.Agent, painNow?: number) {
  const query = painNow === undefined ? `today=${TODAY}` : `today=${TODAY}&painNow=${painNow}`;
  const res = await agent.get(`/api/program/today?${query}`).expect(200);
  return (res.body.exercises as { id: number }[]).map((e) => e.id);
}

async function logSession(agent: request.Agent, localDate: string, painBefore = 3, painAfter = 2) {
  const ids = await exerciseIds(agent);
  return agent
    .post('/api/sessions')
    .send({
      localDate,
      startedAt: `${localDate}T10:00:00.000Z`,
      durationSeconds: 420,
      painBefore,
      painAfter,
      exercises: ids.map((exerciseId) => ({ exerciseId, setsCompleted: 1, repsCompleted: 5, skipped: false })),
    })
    .expect(201);
}

describe('auth', () => {
  it('registers, reads the session, logs out', async () => {
    const agent = await signUp();
    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user).toMatchObject({ name: 'Sam', email: 'sam@example.com' });
    expect(me.body.profile).toMatchObject({ phase: 1, onboarded: false });
    expect(me.body.user).not.toHaveProperty('password_hash');

    const session = await agent.get('/api/auth/session').expect(200);
    expect(session.body.user.email).toBe('sam@example.com');

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
    expect((await agent.get('/api/auth/session').expect(200)).body).toBeNull();
  });

  it('rejects duplicate emails regardless of case', async () => {
    await signUp('sam@example.com');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'SAM@example.com', password: 'another-pass' })
      .expect(409);
    expect(res.body.error).toMatch(/already exists/);
  });

  it('validates registration input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sam', email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(res.body.details.map((d: { path: string }) => d.path)).toEqual(['email', 'password']);
  });

  it('logs in with the right password only', async () => {
    await signUp();
    await request(app).post('/api/auth/login').send({ email: 'sam@example.com', password: 'wrong-pass' }).expect(401);
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'Sam@Example.com', password: 'correct-horse' }).expect(200);
    await agent.get('/api/auth/me').expect(200);
  });

  it('protects API routes', async () => {
    await request(app).get('/api/exercises').expect(401);
    await request(app).get('/api/insights/dashboard').set('Cookie', 'gw_session=forged').expect(401);
  });

  it('deletes the account and all its data after confirming the password', async () => {
    const agent = await signUp();
    await logSession(agent, TODAY);
    await agent.delete('/api/auth/account').send({ password: 'nope' }).expect(403);
    await agent.delete('/api/auth/account').send({ password: 'correct-horse' }).expect(204);
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM session_exercises').get()).toEqual({ n: 0 });
  });
});

describe('profile', () => {
  it('saves onboarding answers', async () => {
    const agent = await signUp();
    const res = await agent
      .patch('/api/profile')
      .send({
        name: 'Samira',
        affectedHand: 'both',
        dominantHand: 'left',
        symptomDuration: 'over_12_months',
        postSurgery: true,
        goals: ['Sleep through the night'],
        reminderTime: '19:45',
        onboarded: true,
      })
      .expect(200);
    expect(res.body.user.name).toBe('Samira');
    expect(res.body.profile).toMatchObject({
      affectedHand: 'both',
      dominantHand: 'left',
      postSurgery: true,
      goals: ['Sleep through the night'],
      reminderTime: '19:45',
      onboarded: true,
    });
  });

  it('rejects unknown fields and bad values', async () => {
    const agent = await signUp();
    await agent.patch('/api/profile').send({ phase: 3 }).expect(400);
    await agent.patch('/api/profile').send({ reminderTime: '25:00' }).expect(400);
  });
});

describe('exercises and routine', () => {
  it('lists the library with phase locks', async () => {
    const agent = await signUp();
    const res = await agent.get('/api/exercises').expect(200);
    expect(res.body.exercises.length).toBeGreaterThanOrEqual(12);
    const locked = res.body.exercises.filter((e: { unlocked: boolean }) => !e.unlocked);
    expect(locked.every((e: { phase: number }) => e.phase > 1)).toBe(true);

    const detail = await agent.get('/api/exercises/tendon-glides').expect(200);
    expect(detail.body.steps.length).toBeGreaterThan(3);
    await agent.get('/api/exercises/nope').expect(404);
  });

  it('switches to the gentle routine when pain is high', async () => {
    const agent = await signUp();
    const normal = await agent.get(`/api/program/today?today=${TODAY}`).expect(200);
    expect(normal.body).toMatchObject({ phase: 1, flareMode: false });
    expect(normal.body.exercises).toHaveLength(5);

    const flare = await agent.get(`/api/program/today?today=${TODAY}&painNow=8`).expect(200);
    expect(flare.body.flareMode).toBe(true);
    expect(flare.body.exercises.map((e: { category: string }) => e.category)).not.toContain('strength');
    expect(flare.body.exercises.length).toBeLessThan(normal.body.exercises.length);

    // A high symptom log also triggers the gentle routine.
    await agent
      .post('/api/symptoms')
      .send({ localDate: TODAY, pain: 8, numbness: 4, tingling: 5 })
      .expect(201);
    const afterLog = await agent.get(`/api/program/today?today=${TODAY}`).expect(200);
    expect(afterLog.body.flareMode).toBe(true);
  });
});

describe('sessions', () => {
  it('records a session with feedback on pain change', async () => {
    const agent = await signUp();
    const eased = await logSession(agent, TODAY, 5, 3);
    expect(eased.body.session).toMatchObject({ painBefore: 5, painAfter: 3, phase: 1, exerciseCount: 5, completedCount: 5 });
    expect(eased.body.feedback.tone).toBe('positive');

    const worse = await logSession(agent, TODAY, 2, 5);
    expect(worse.body.feedback.tone).toBe('warning');

    const list = await agent.get('/api/sessions').expect(200);
    expect(list.body).toHaveLength(2);
    const detail = await agent.get(`/api/sessions/${list.body[0].id}`).expect(200);
    expect(detail.body.exercises).toHaveLength(5);
  });

  it('rejects invalid sessions', async () => {
    const agent = await signUp();
    const base = { localDate: TODAY, startedAt: `${TODAY}T10:00:00.000Z`, durationSeconds: 60, painBefore: 2, painAfter: 2 };
    await agent
      .post('/api/sessions')
      .send({ ...base, exercises: [{ exerciseId: 9999, setsCompleted: 1, repsCompleted: 5, skipped: false }] })
      .expect(400);
    const [id] = await exerciseIds(agent);
    await agent
      .post('/api/sessions')
      .send({ ...base, exercises: [{ exerciseId: id, setsCompleted: 0, repsCompleted: 0, skipped: true }] })
      .expect(400);
    await agent.post('/api/sessions').send({ ...base, painBefore: 11, exercises: [] }).expect(400);
  });

  it('keeps users apart', async () => {
    const sam = await signUp('sam@example.com');
    const created = await logSession(sam, TODAY);
    const alex = await signUp('alex@example.com');
    await alex.get(`/api/sessions/${created.body.session.id}`).expect(404);
    expect((await alex.get('/api/sessions').expect(200)).body).toHaveLength(0);
  });
});

describe('phase progression', () => {
  it('unlocks the next phase only once the criteria are met', async () => {
    const agent = await signUp();
    await agent.post('/api/program/phase').send({ phase: 2, today: TODAY }).expect(409);

    for (let i = 5; i >= 0; i--) await logSession(agent, addDays(TODAY, -i), 2, 1);
    const progress = await agent.get(`/api/program/progress?today=${TODAY}`).expect(200);
    expect(progress.body).toMatchObject({ phase: 1, sessionsInPhase: 6, eligible: true, next: { phase: 2 } });

    await agent.post('/api/program/phase').send({ phase: 3, today: TODAY }).expect(400);
    const advanced = await agent.post('/api/program/phase').send({ phase: 2, today: TODAY }).expect(200);
    expect(advanced.body.profile.phase).toBe(2);

    // The new phase starts its own count, and its routine adds stretches.
    const fresh = await agent.get(`/api/program/progress?today=${TODAY}`).expect(200);
    expect(fresh.body).toMatchObject({ phase: 2, sessionsInPhase: 0, eligible: false });
    const routine = await agent.get(`/api/program/today?today=${TODAY}`).expect(200);
    expect(routine.body.exercises.some((e: { category: string }) => e.category === 'stretch')).toBe(true);

    // Stepping back is always allowed.
    const back = await agent.post('/api/program/phase').send({ phase: 1 }).expect(200);
    expect(back.body.profile.phase).toBe(1);
  });

  it('holds progression when pain is high or sessions flare symptoms', async () => {
    const agent = await signUp();
    for (let i = 5; i >= 1; i--) await logSession(agent, addDays(TODAY, -i), 2, 1);
    await logSession(agent, TODAY, 2, 5);
    const progress = await agent.get(`/api/program/progress?today=${TODAY}`).expect(200);
    expect(progress.body.eligible).toBe(false);
    expect(progress.body.criteria.find((c: { key: string }) => c.key === 'flares').met).toBe(false);
  });
});

describe('symptoms', () => {
  it('logs, lists and deletes entries', async () => {
    const agent = await signUp();
    const created = await agent
      .post('/api/symptoms')
      .send({ localDate: TODAY, pain: 4, numbness: 3, tingling: 5, nightWaking: 2, gripStrengthKg: 18.5, notes: 'Typed a lot' })
      .expect(201);
    expect(created.body).toMatchObject({ pain: 4, gripStrengthKg: 18.5, nightWaking: 2 });

    const other = await signUp('alex@example.com');
    await other.delete(`/api/symptoms/${created.body.id}`).expect(404);

    expect((await agent.get('/api/symptoms').expect(200)).body).toHaveLength(1);
    await agent.delete(`/api/symptoms/${created.body.id}`).expect(204);
    expect((await agent.get('/api/symptoms').expect(200)).body).toHaveLength(0);
  });

  it('validates scores', async () => {
    const agent = await signUp();
    await agent.post('/api/symptoms').send({ localDate: TODAY, pain: 12, numbness: 0, tingling: 0 }).expect(400);
    await agent.post('/api/symptoms').send({ localDate: '10/03/2026', pain: 1, numbness: 0, tingling: 0 }).expect(400);
  });
});

describe('weekly symptom check', () => {
  it('scores answers and compares with the previous check', async () => {
    const agent = await signUp();
    const questions = await agent.get('/api/assessments/questions').expect(200);
    expect(questions.body).toHaveLength(11);

    await agent.post('/api/assessments').send({ localDate: TODAY, answers: [1, 2, 3] }).expect(400);
    const first = await agent
      .post('/api/assessments')
      .send({ localDate: addDays(TODAY, -7), answers: Array(11).fill(3) })
      .expect(201);
    expect(first.body.assessment).toMatchObject({ score: 3, band: 'Severe' });
    expect(first.body.previous).toBeNull();

    const second = await agent
      .post('/api/assessments')
      .send({ localDate: TODAY, answers: [2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1] })
      .expect(201);
    expect(second.body.assessment.score).toBeCloseTo(1.82, 2);
    expect(second.body.assessment.band).toBe('Mild');
    expect(second.body.previous.score).toBe(3);
  });
});

describe('insights', () => {
  it('builds the dashboard with streak and week view', async () => {
    const agent = await signUp();
    for (const offset of [-3, -2, -1, 0]) await logSession(agent, addDays(TODAY, offset));
    await logSession(agent, addDays(TODAY, -6));

    const res = await agent.get(`/api/insights/dashboard?today=${TODAY}`).expect(200);
    expect(res.body).toMatchObject({ name: 'Sam', today: TODAY, streak: 4, todaySessions: 1, assessmentDue: true });
    expect(res.body.week.map((d: { done: boolean }) => d.done)).toEqual([true, false, false, true, true, true, true]);
    expect(res.body.routine).toMatchObject({ exerciseCount: 5, flareMode: false });
    expect(res.body.phase.sessionsInPhase).toBe(5);
  });

  it('keeps yesterday’s streak alive until today ends', async () => {
    const agent = await signUp();
    await logSession(agent, addDays(TODAY, -2));
    await logSession(agent, addDays(TODAY, -1));
    const res = await agent.get(`/api/insights/dashboard?today=${TODAY}`).expect(200);
    expect(res.body.streak).toBe(2);
  });

  it('summarises progress over a date range', async () => {
    const agent = await signUp();
    await logSession(agent, addDays(TODAY, -40)); // outside the range
    await logSession(agent, addDays(TODAY, -1), 4, 2);
    await logSession(agent, TODAY, 3, 3);
    await agent.post('/api/symptoms').send({ localDate: TODAY, pain: 2, numbness: 1, tingling: 3, gripStrengthKg: 20 });
    await agent.post('/api/symptoms').send({ localDate: TODAY, pain: 4, numbness: 1, tingling: 1, gripStrengthKg: 22 });

    const res = await agent.get(`/api/insights/progress?today=${TODAY}&days=30`).expect(200);
    expect(res.body.activity).toHaveLength(30);
    expect(res.body.activity.at(-1)).toMatchObject({ date: TODAY, sessions: 1 });
    expect(res.body.symptoms).toEqual([
      { date: TODAY, pain: 3, numbness: 1, tingling: 2, nightWaking: 0, gripStrengthKg: 21 },
    ]);
    expect(res.body.totals).toMatchObject({ sessions: 2, activeDays: 2, avgPainChange: -1, currentStreak: 2 });
  });
});
