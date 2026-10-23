import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// src/ in development (tsx) and dist/ in production both sit one level below the package root.
const serverRoot = path.resolve(here, '..');

const isProd = process.env.NODE_ENV === 'production';

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (isProd) throw new Error('JWT_SECRET must be set when NODE_ENV=production');
  return 'gripwise-dev-only-secret';
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProd,
  jwtSecret: jwtSecret(),
  databaseFile: process.env.DATABASE_FILE ?? path.join(serverRoot, 'data', 'gripwise.db'),
  clientDist: process.env.CLIENT_DIST ?? path.resolve(serverRoot, '..', 'client', 'dist'),
  trustProxy: process.env.TRUST_PROXY === 'true',
  // Secure cookies need HTTPS. Set COOKIE_SECURE=false to run a production build over plain HTTP.
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
};
