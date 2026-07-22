import { getDbClient } from '../db/client';
import { runMigrations } from '../db/migrate';
import { seedRuntimeDemoData } from '../db/seed-runtime-demo';

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig();
  const { db, sqlite } = getDbClient(config.dbPath);

  runMigrations(sqlite);
  if (String(config.demoMode) === 'true') {
    await seedRuntimeDemoData(db, sqlite);
  }
});
