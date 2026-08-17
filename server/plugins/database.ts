import { getDbClient } from '../db/client';
import { runMigrations } from '../db/migrate';
import { resetScenarioBaselineOnce } from '../db/startup-reset';
import {
  shouldResetDemoDatabaseOnStartup,
  shouldSeedDemoDatabaseOnStartup
} from '../db/startup-policy';

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig();

  if (shouldResetDemoDatabaseOnStartup(config)) {
    const { resetDemoDatabase } = await import('../db/reset-demo');
    await resetScenarioBaselineOnce(() =>
      resetDemoDatabase(config.dbPath, { resetDocuments: true })
    );
    return;
  }

  const { db, sqlite } = getDbClient(config.dbPath);

  // Ensure all database tables & migrations are executed
  runMigrations(sqlite);

  // Check if database needs initial seeding (only when brand new / empty)
  const empCountRow = sqlite.prepare('SELECT COUNT(*) count FROM employees').get() as
    { count: number } | undefined;
  if (!empCountRow || empCountRow.count === 0) {
    const { seedDemoData } = await import('../db/seed');
    const { createDemoSeedContext } = await import('../db/seeds/context');
    await seedDemoData(db, createDemoSeedContext());
  }

  const flightCount = sqlite.prepare('SELECT COUNT(*) AS count FROM flight_operations').get() as {
    count: number;
  };
  if (flightCount.count === 0 && shouldSeedDemoDatabaseOnStartup(config)) {
    const { seedScenarioDatabase } = await import('../db/seeds/scenario-database');
    await resetScenarioBaselineOnce(() =>
      seedScenarioDatabase(
        { db, sqlite },
        {
          resetDocuments: true
        }
      )
    );
  }
});
