import { createDbClient } from '../server/db/client';
import { runMigrations } from '../server/db/migrate';
import { createDemoSeedContext } from '../server/db/seeds/context';
import { seedScenarioDatabase } from '../server/db/seeds/scenario-database';

const dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite';
const { db, sqlite } = createDbClient(dbPath);

try {
  runMigrations(sqlite);
  const existing = sqlite.prepare('SELECT COUNT(*) AS count FROM flight_operations').get() as {
    count: number;
  };
  if (existing.count > 0) {
    throw new Error('Scenario data already exists. Run `pnpm demo:reset` for a clean baseline.');
  }
  await seedScenarioDatabase({ db, sqlite }, { context: createDemoSeedContext() });
  console.log(`Seeded fictional PT AMA operational scenarios at ${dbPath}`);
} finally {
  sqlite.close();
}
