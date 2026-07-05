import { createDbClient } from '../server/db/client';
import { runMigrations } from '../server/db/migrate';
import { seedDemoData } from '../server/db/seed';

const dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite';
const { db, sqlite } = createDbClient(dbPath);

runMigrations(sqlite);
await seedDemoData(db);
sqlite.close();

console.log(`Seeded fictional PT AMA demo data at ${dbPath}`);
