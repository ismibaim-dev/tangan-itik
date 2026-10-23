import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const SESSION_COOKIE = 'gw_session';
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string): Promise<string> {
  // Cheaper hashing under test keeps the suite fast; production uses a cost of 12.
  return bcrypt.hash(password, process.env.NODE_ENV === 'test' ? 4 : 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signSession(userId: number): string {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: SESSION_MAX_AGE_MS / 1000 });
}

export function readSession(token: string): number | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const id = typeof payload === 'object' ? Number(payload.sub) : NaN;
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
