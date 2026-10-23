// Deletes the local SQLite database and recreates it with the schema and exercise library.
import '../env.js';
import fs from 'node:fs';
import { config } from '../config.js';
import { openDatabase } from '../db/index.js';

for (const suffix of ['', '-wal', '-shm']) fs.rmSync(config.databaseFile + suffix, { force: true });
openDatabase(config.databaseFile).close();
console.log(`Fresh database created at ${config.databaseFile}`);
