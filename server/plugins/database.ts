import { getDbClient } from '../db/client';
import { runMigrations } from '../db/migrate';
import { createDemoSeedContext } from '../db/seeds/context';

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig();
  const { db, sqlite } = getDbClient(config.dbPath);

  // Ensure all database tables & migrations are executed
  runMigrations(sqlite);

  // Check if database needs initial seeding (only when brand new / empty)
  const empCountRow = sqlite.prepare('SELECT COUNT(*) count FROM employees').get() as
    { count: number } | undefined;
  if (!empCountRow || empCountRow.count === 0) {
    const { seedDemoData } = await import('../db/seed');
    await seedDemoData(db, createDemoSeedContext());
  }

  void db;
});
