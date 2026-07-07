import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createDbClient, resolveDbPath } from '../server/db/client';
import { dropDemoDatabase, runMigrations } from '../server/db/migrate';
import { seedDemoData } from '../server/db/seed';
import { seedFlightOperationsData } from '../server/db/seed-flight-operations';

const dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite';
const resolvedDbPath = resolveDbPath(dbPath);

if (resolvedDbPath !== ':memory:') {
  await rm(resolvedDbPath, { force: true });
  await rm(`${resolvedDbPath}-wal`, { force: true });
  await rm(`${resolvedDbPath}-shm`, { force: true });
}

const { db, sqlite } = createDbClient(dbPath);
dropDemoDatabase(sqlite);
runMigrations(sqlite);
await seedDemoData(db);
seedFlightOperationsData(sqlite);
sqlite.close();

await rm(join(process.cwd(), 'public', 'uploads', 'mock-receipts', '.DS_Store'), { force: true });

console.log(`Reset and reseeded AMA demo database at ${dbPath}`);
