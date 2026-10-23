import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { openFirstIntact, openIfIntact } from './recovery';
import { migrate } from './schema';
import { Db } from './sqlite';

let SQL: SqlJsStatic;
let saved: Uint8Array;

beforeAll(async () => {
  SQL = await initSqlJs();
  const db = new Db(new SQL.Database());
  migrate(db);
  for (let i = 0; i < 500; i++) {
    db.run('INSERT INTO symptom_logs (local_date, pain, numbness, tingling) VALUES (?, ?, ?, ?)', '2026-03-10', 1, 2, 3);
  }
  saved = db.export();
});

const logs = (db: Db | null) => db?.get<{ n: number }>('SELECT COUNT(*) AS n FROM symptom_logs')?.n;

describe('opening saved copies', () => {
  it('opens a complete copy', () => {
    expect(logs(openIfIntact(SQL, saved))).toBe(500);
  });

  it('rejects copies cut short by an interrupted save', () => {
    expect(openIfIntact(SQL, saved.slice(0, Math.floor(saved.length / 2)))).toBeNull();
    expect(openIfIntact(SQL, saved.slice(0, 100))).toBeNull();
    expect(openIfIntact(SQL, new Uint8Array(0))).toBeNull();
    expect(openIfIntact(SQL, new Uint8Array(4096).fill(7))).toBeNull();
  });

  it('falls back to the backup when the main copy is damaged', () => {
    expect(logs(openFirstIntact(SQL, [new Uint8Array(0), saved]))).toBe(500);
    expect(logs(openFirstIntact(SQL, [saved.slice(0, 2000), saved]))).toBe(500);
    expect(openFirstIntact(SQL, [new Uint8Array(0)])).toBeNull();
    expect(openFirstIntact(SQL, [])).toBeNull();
  });
});
