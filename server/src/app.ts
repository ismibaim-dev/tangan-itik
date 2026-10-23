import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import type { DB } from './db/index.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { assessmentsRouter } from './routes/assessments.js';
import { authRouter } from './routes/auth.js';
import { exercisesRouter } from './routes/exercises.js';
import { insightsRouter } from './routes/insights.js';
import { profileRouter } from './routes/profile.js';
import { programRouter } from './routes/program.js';
import { sessionsRouter } from './routes/sessions.js';
import { symptomsRouter } from './routes/symptoms.js';

export interface AppOptions {
  /** Built client to serve alongside the API (production). */
  clientDist?: string;
  rateLimit?: boolean;
  trustProxy?: boolean;
}

export function createApp(db: DB, options: AppOptions = {}) {
  const app = express();
  if (options.trustProxy) app.set('trust proxy', 1);

  // No upgrade-insecure-requests, so the app still works when opened over plain HTTP on a LAN address.
  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  api.use('/auth', authRouter(db, { rateLimit: options.rateLimit ?? true }));

  api.use(requireAuth(db));
  api.use('/profile', profileRouter(db));
  api.use('/exercises', exercisesRouter(db));
  api.use('/program', programRouter(db));
  api.use('/sessions', sessionsRouter(db));
  api.use('/symptoms', symptomsRouter(db));
  api.use('/assessments', assessmentsRouter(db));
  api.use('/insights', insightsRouter(db));

  app.use('/api', api, notFound);

  const indexHtml = options.clientDist && path.join(options.clientDist, 'index.html');
  if (options.clientDist && indexHtml && fs.existsSync(indexHtml)) {
    app.use(express.static(options.clientDist, { index: false, maxAge: '1h' }));
    // Client-side routes all render the single-page app.
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(indexHtml);
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
