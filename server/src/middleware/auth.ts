import type { NextFunction, Request, Response } from 'express';
import type { DB } from '../db/index.js';
import { HttpError } from '../lib/http.js';
import { readSession, SESSION_COOKIE } from '../services/auth.js';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function requireAuth(db: DB) {
  const userExists = db.prepare('SELECT 1 FROM users WHERE id = ?');
  return (req: Request, _res: Response, next: NextFunction) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const userId = typeof token === 'string' ? readSession(token) : null;
    if (!userId || !userExists.get(userId)) throw new HttpError(401, 'Please sign in to continue');
    req.userId = userId;
    next();
  };
}

/** The signed-in user's id. Only valid behind requireAuth. */
export function currentUser(req: Request): number {
  if (!req.userId) throw new HttpError(401, 'Please sign in to continue');
  return req.userId;
}
