// Opens the on-device database and saves it after every change.
//   Android: a SQLite file in the app's private storage, which Android's own app backup includes.
//   Browser (development): IndexedDB.
// Nothing leaves the device; the CSV export is the only way data gets out.
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import { buildCsvExport } from './csv';
import { AppError } from './errors';
import { openFirstIntact } from './recovery';
import * as repo from './repository';
import { migrate } from './schema';
import { seedExercises } from './seed';
import { Db } from './sqlite';

interface Persistence {
  /** Saved copies of the database, most preferred first. */
  load(): Promise<Uint8Array[]>;
  save(bytes: Uint8Array): Promise<void>;
  /** Keeps copies that couldn't be opened under another name, rather than overwriting them. */
  setAside(copies: Uint8Array[]): Promise<void>;
  clear(): Promise<void>;
}

const FILE = 'gripwise.sqlite';
const BACKUP = `${FILE}.backup`;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function readDeviceFile(path: string): Promise<Uint8Array | null> {
  try {
    const { data } = await Filesystem.readFile({ path, directory: Directory.Data });
    return typeof data === 'string' ? fromBase64(data) : new Uint8Array(await data.arrayBuffer());
  } catch {
    return null;
  }
}

const deviceFile: Persistence = {
  async load() {
    const copies = [await readDeviceFile(FILE), await readDeviceFile(BACKUP)];
    return copies.filter((bytes): bytes is Uint8Array => bytes !== null);
  },
  // Two full copies, written one after the other: if the app stops mid-write, the other copy is
  // still complete, and openDb() picks whichever one passes SQLite's integrity check.
  async save(bytes) {
    const data = toBase64(bytes);
    await Filesystem.writeFile({ path: BACKUP, directory: Directory.Data, data });
    await Filesystem.writeFile({ path: FILE, directory: Directory.Data, data });
  },
  async setAside(copies) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    for (const [i, bytes] of copies.entries()) {
      await Filesystem.writeFile({ path: `unreadable-${stamp}-${i}.sqlite`, directory: Directory.Data, data: toBase64(bytes) });
    }
  },
  async clear() {
    for (const path of [FILE, BACKUP]) await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(() => {});
  },
};

function indexedDb<T>(mode: IDBTransactionMode, run: (files: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('gripwise', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('files');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('files', mode);
      const request = run(tx.objectStore('files'));
      tx.oncomplete = () => {
        open.result.close();
        resolve(request.result);
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}

const browserStorage: Persistence = {
  async load() {
    const bytes = (await indexedDb('readonly', (files) => files.get(FILE))) as Uint8Array | undefined;
    return bytes ? [bytes] : [];
  },
  save: (bytes) => indexedDb('readwrite', (files) => files.put(bytes, FILE)).then(() => undefined),
  setAside: (copies) =>
    indexedDb('readwrite', (files) => files.put(copies, `unreadable-${Date.now()}`)).then(() => undefined),
  clear: () => indexedDb('readwrite', (files) => files.delete(FILE)).then(() => undefined),
};

const persistence = Capacitor.isNativePlatform() ? deviceFile : browserStorage;

// Remembers that this device has saved data, so a failed read is never mistaken for a first launch
// (which would start an empty database and save it over the real one).
const SAVED_MARKER = 'gripwise.hasSavedData';

function hasSavedData(): boolean {
  try {
    return localStorage.getItem(SAVED_MARKER) === 'true';
  } catch {
    return false;
  }
}

function markSavedData(saved: boolean) {
  try {
    if (saved) localStorage.setItem(SAVED_MARKER, 'true');
    else localStorage.removeItem(SAVED_MARKER);
  } catch {
    // Storage unavailable: the marker is only a safety net.
  }
}

let opening: Promise<Db> | null = null;
let saving: Promise<void> = Promise.resolve();

async function openDb(): Promise<Db> {
  const [SQL, copies] = await Promise.all([initSqlJs({ locateFile: () => wasmUrl }), persistence.load()]);
  if (copies.length === 0 && hasSavedData()) {
    throw new AppError("Couldn't open your saved data. Close GripWise completely and open it again.");
  }
  let db = openFirstIntact(SQL, copies);
  if (!db && copies.length > 0) {
    console.error('No intact copy of the GripWise database was found; keeping the damaged copies and starting fresh.');
    await persistence.setAside(copies);
  }
  db ??= new Db(new SQL.Database());
  migrate(db);
  seedExercises(db);
  await save(db);
  return db;
}

function getDb(): Promise<Db> {
  opening ??= openDb().catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

/** Saves run one at a time, each writing the latest state. A failed save doesn't block later ones. */
function save(db: Db): Promise<void> {
  const next = saving
    .catch(() => undefined)
    .then(() => persistence.save(db.export()))
    .then(() => markSavedData(true));
  saving = next;
  return next;
}

function read<A extends unknown[], R>(fn: (db: Db, ...args: A) => R) {
  return async (...args: A): Promise<R> => fn(await getDb(), ...args);
}

function write<A extends unknown[], R>(fn: (db: Db, ...args: A) => R) {
  return async (...args: A): Promise<R> => {
    const db = await getDb();
    const result = fn(db, ...args);
    await save(db);
    return result;
  };
}

export const store = {
  getAccount: read(repo.getAccount),
  createProfile: write(repo.createProfile),
  updateProfile: write(repo.updateProfile),
  getExercises: read(repo.getExercises),
  getExercise: read(repo.getExercise),
  getRoutine: read(repo.getRoutine),
  getPhaseProgress: read(repo.getPhaseProgress),
  changePhase: write(repo.changePhase),
  saveSession: write(repo.saveSession),
  listSessions: read(repo.listSessions),
  logSymptoms: write(repo.logSymptoms),
  listSymptomLogs: read(repo.listSymptomLogs),
  deleteSymptomLog: write(repo.deleteSymptomLog),
  submitAssessment: write(repo.submitAssessment),
  getDashboard: read(repo.getDashboard),
  getProgress: read(repo.getProgress),
  buildCsvExport: read(buildCsvExport),

  /** Deletes everything on this device. The next read starts a fresh, empty database. */
  async eraseAllData(): Promise<void> {
    const db = await getDb();
    await saving.catch(() => undefined);
    opening = null;
    db.close();
    await persistence.clear();
    markSavedData(false);
  },
};
