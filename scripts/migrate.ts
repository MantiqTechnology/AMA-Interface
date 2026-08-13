import { loadLocalEnv } from './load-env';
import { createDbClient } from '../server/db/client';
import { runMigrations } from '../server/db/migrate';

loadLocalEnv();

const dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite';
const { sqlite } = createDbClient(dbPath);

runMigrations(sqlite);
sqlite.close();

console.log(`Migrated AMA demo database at ${dbPath}`);
