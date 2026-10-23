import type { Database, SqlValue } from 'sql.js';

export type Row = Record<string, SqlValue>;

/**
 * A small synchronous wrapper over a sql.js database, shaped like better-sqlite3:
 * get / all / run / transaction. Statements are freed after every call.
 */
export class Db {
  constructor(private readonly raw: Database) {
    this.configure();
  }

  private configure() {
    this.raw.run('PRAGMA foreign_keys = ON');
  }

  exec(sql: string): void {
    this.raw.exec(sql);
  }

  get<T = Row>(sql: string, ...params: SqlValue[]): T | undefined {
    const stmt = this.raw.prepare(sql);
    try {
      stmt.bind(params);
      return stmt.step() ? (stmt.getAsObject() as T) : undefined;
    } finally {
      stmt.free();
    }
  }

  all<T = Row>(sql: string, ...params: SqlValue[]): T[] {
    const stmt = this.raw.prepare(sql);
    try {
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  }

  run(sql: string, ...params: SqlValue[]): { changes: number; lastInsertRowid: number } {
    this.raw.run(sql, params);
    const changes = this.raw.getRowsModified();
    const { id } = this.get<{ id: number }>('SELECT last_insert_rowid() AS id')!;
    return { changes, lastInsertRowid: id };
  }

  transaction<T>(fn: () => T): T {
    this.raw.run('BEGIN');
    try {
      const result = fn();
      this.raw.run('COMMIT');
      return result;
    } catch (error) {
      this.raw.run('ROLLBACK');
      throw error;
    }
  }

  /** The whole database as a SQLite file. sql.js reopens the database to do this, which resets pragmas. */
  export(): Uint8Array {
    const bytes = this.raw.export();
    this.configure();
    return bytes;
  }

  close(): void {
    this.raw.close();
  }
}
