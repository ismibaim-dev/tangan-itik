import type { SqlJsStatic } from 'sql.js';
import { Db } from './sqlite';

const SQLITE_HEADER = 'SQLite format 3\0';

/** Opens a saved copy only if it is a complete SQLite file that passes SQLite's integrity check. */
export function openIfIntact(SQL: SqlJsStatic, bytes: Uint8Array): Db | null {
  // An empty or cut-off file would otherwise open as a valid, empty database.
  if (String.fromCharCode(...bytes.subarray(0, SQLITE_HEADER.length)) !== SQLITE_HEADER) return null;
  try {
    const db = new Db(new SQL.Database(bytes));
    if (db.get<{ quick_check: string }>('PRAGMA quick_check')?.quick_check === 'ok') return db;
    db.close();
  } catch {
    // Not a readable SQLite file.
  }
  return null;
}

/** The first intact copy, in the order given (most preferred first). */
export function openFirstIntact(SQL: SqlJsStatic, copies: Uint8Array[]): Db | null {
  for (const bytes of copies) {
    const db = openIfIntact(SQL, bytes);
    if (db) return db;
  }
  return null;
}
