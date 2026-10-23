import './env.js';
import { createApp } from './app.js';
import { config } from './config.js';
import { openDatabase } from './db/index.js';

const db = openDatabase(config.databaseFile);
const app = createApp(db, { clientDist: config.clientDist, trustProxy: config.trustProxy });

const server = app.listen(config.port, () => {
  console.log(`GripWise API listening on http://localhost:${config.port}`);
  console.log(`Database: ${config.databaseFile}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
