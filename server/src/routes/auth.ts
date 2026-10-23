import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import type { DB } from '../db/index.js';
import { HttpError, parse } from '../lib/http.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import {
  hashPassword,
  readSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  signSession,
  verifyPassword,
} from '../services/auth.js';
import { getAccount } from '../services/users.js';

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Tell us your name').max(80),
  email,
  password,
});
const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password') });
const deleteSchema = z.object({ password: z.string().min(1, 'Enter your password to confirm') });

function startSession(res: Response, userId: number) {
  res.cookie(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
}

export function authRouter(db: DB, options: { rateLimit: boolean }) {
  const router = Router();
  const auth = requireAuth(db);

  if (options.rateLimit) {
    router.use(
      ['/login', '/register'],
      rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }),
    );
  }

  router.post('/register', async (req, res) => {
    const body = parse(registerSchema, req.body);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(body.email)) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    const passwordHash = await hashPassword(body.password);
    const userId = db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
        .run(body.email, passwordHash, body.name);
      db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(lastInsertRowid);
      return Number(lastInsertRowid);
    })();
    startSession(res, userId);
    res.status(201).json(getAccount(db, userId));
  });

  router.post('/login', async (req, res) => {
    const body = parse(loginSchema, req.body);
    const row = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(body.email) as
      | { id: number; password_hash: string }
      | undefined;
    if (!row || !(await verifyPassword(body.password, row.password_hash))) {
      throw new HttpError(401, 'Email or password is incorrect');
    }
    startSession(res, row.id);
    res.json(getAccount(db, row.id));
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  });

  router.get('/me', auth, (req, res) => {
    res.json(getAccount(db, currentUser(req)));
  });

  /** Like /me, but answers null instead of 401 when signed out, so the app can check quietly on load. */
  router.get('/session', (req, res) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const userId = typeof token === 'string' ? readSession(token) : null;
    const exists = userId !== null && db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
    res.json(exists ? getAccount(db, userId) : null);
  });

  router.delete('/account', auth, async (req, res) => {
    const userId = currentUser(req);
    const body = parse(deleteSchema, req.body);
    const { password_hash } = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as {
      password_hash: string;
    };
    if (!(await verifyPassword(body.password, password_hash))) throw new HttpError(403, 'Password is incorrect');
    // Profiles, sessions, logs and assessments cascade with the user row.
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  });

  return router;
}
