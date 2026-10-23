// Ordered schema migrations, applied once each and recorded in schema_migrations.
// Never edit a migration that has shipped in an APK: add a new one instead.
import type { Db } from './sqlite';

interface Migration {
  id: number;
  name: string;
  sql: string;
}

const now = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

const migrations: Migration[] = [
  {
    id: 1,
    name: 'initial_schema',
    sql: `
      -- One person per device, so the profile is a single row created by onboarding.
      CREATE TABLE profile (
        id               INTEGER PRIMARY KEY CHECK (id = 1),
        name             TEXT    NOT NULL,
        affected_hand    TEXT    NOT NULL CHECK (affected_hand IN ('left', 'right', 'both')),
        dominant_hand    TEXT    NOT NULL CHECK (dominant_hand IN ('left', 'right')),
        symptom_duration TEXT    CHECK (symptom_duration IN ('under_3_months', '3_to_12_months', 'over_12_months')),
        post_surgery     INTEGER NOT NULL DEFAULT 0 CHECK (post_surgery IN (0, 1)),
        goals            TEXT    NOT NULL DEFAULT '[]',
        reminder_time    TEXT    CHECK (reminder_time IS NULL OR reminder_time GLOB '[0-2][0-9]:[0-5][0-9]'),
        phase            INTEGER NOT NULL DEFAULT 1 CHECK (phase BETWEEN 1 AND 3),
        phase_started_at TEXT    NOT NULL DEFAULT ${now},
        created_at       TEXT    NOT NULL DEFAULT ${now},
        updated_at       TEXT    NOT NULL DEFAULT ${now}
      );

      CREATE TABLE exercises (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        slug         TEXT    NOT NULL UNIQUE,
        name         TEXT    NOT NULL,
        category     TEXT    NOT NULL CHECK (category IN ('nerve_glide', 'tendon_glide', 'mobility', 'stretch', 'strength')),
        phase        INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 3),
        summary      TEXT    NOT NULL,
        steps        TEXT    NOT NULL,
        sets         INTEGER NOT NULL DEFAULT 1 CHECK (sets >= 1),
        reps         INTEGER NOT NULL CHECK (reps >= 1),
        hold_seconds INTEGER NOT NULL CHECK (hold_seconds >= 1),
        cue          TEXT    NOT NULL DEFAULT 'Hold',
        rest_seconds INTEGER NOT NULL DEFAULT 15 CHECK (rest_seconds >= 0),
        equipment    TEXT,
        caution      TEXT,
        sort_order   INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE sessions (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        local_date       TEXT    NOT NULL,
        started_at       TEXT    NOT NULL,
        completed_at     TEXT    NOT NULL DEFAULT ${now},
        duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
        phase            INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 3),
        flare_mode       INTEGER NOT NULL DEFAULT 0 CHECK (flare_mode IN (0, 1)),
        pain_before      INTEGER NOT NULL CHECK (pain_before BETWEEN 0 AND 10),
        pain_after       INTEGER NOT NULL CHECK (pain_after BETWEEN 0 AND 10),
        notes            TEXT
      );
      CREATE INDEX idx_sessions_date ON sessions (local_date);

      CREATE TABLE session_exercises (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id     INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id    INTEGER NOT NULL REFERENCES exercises(id),
        position       INTEGER NOT NULL,
        sets_completed INTEGER NOT NULL DEFAULT 0 CHECK (sets_completed >= 0),
        reps_completed INTEGER NOT NULL DEFAULT 0 CHECK (reps_completed >= 0),
        skipped        INTEGER NOT NULL DEFAULT 0 CHECK (skipped IN (0, 1))
      );
      CREATE INDEX idx_session_exercises_session ON session_exercises (session_id);

      CREATE TABLE symptom_logs (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        local_date       TEXT    NOT NULL,
        logged_at        TEXT    NOT NULL DEFAULT ${now},
        pain             INTEGER NOT NULL CHECK (pain BETWEEN 0 AND 10),
        numbness         INTEGER NOT NULL CHECK (numbness BETWEEN 0 AND 10),
        tingling         INTEGER NOT NULL CHECK (tingling BETWEEN 0 AND 10),
        night_waking     INTEGER NOT NULL DEFAULT 0 CHECK (night_waking BETWEEN 0 AND 10),
        grip_strength_kg REAL    CHECK (grip_strength_kg IS NULL OR grip_strength_kg BETWEEN 0 AND 100),
        notes            TEXT
      );
      CREATE INDEX idx_symptom_logs_date ON symptom_logs (local_date);

      CREATE TABLE assessments (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        local_date TEXT    NOT NULL,
        taken_at   TEXT    NOT NULL DEFAULT ${now},
        answers    TEXT    NOT NULL,
        score      REAL    NOT NULL CHECK (score BETWEEN 1 AND 5)
      );
      CREATE INDEX idx_assessments_date ON assessments (local_date);
    `,
  },
];

export function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT ${now}
    )
  `);
  const applied = new Set(db.all<{ id: number }>('SELECT id FROM schema_migrations').map((row) => row.id));
  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    db.transaction(() => {
      db.exec(migration.sql);
      db.run('INSERT INTO schema_migrations (id, name) VALUES (?, ?)', migration.id, migration.name);
    });
  }
}
