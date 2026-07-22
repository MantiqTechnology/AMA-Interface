import { getDbClient } from '../db/client';
import { runMigrations } from '../db/migrate';
import { resetDemoDatabase } from '../db/reset-demo';
import { resetScenarioBaselineOnce } from '../db/startup-reset';

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig();
  const skipStartupReset = process.env.AMA_SKIP_STARTUP_RESET === 'true';

  if (String(config.demoMode) !== 'false' && !skipStartupReset) {
    await resetScenarioBaselineOnce(() =>
      resetDemoDatabase(config.dbPath, { resetDocuments: true })
    );
    return;
  }

  const { db, sqlite } = getDbClient(config.dbPath);

  runMigrations(sqlite);
  void db;
});
