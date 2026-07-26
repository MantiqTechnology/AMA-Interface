import { getDbClient } from '../db/client';
import { runMigrations } from '../db/migrate';
import { resetDemoDatabase } from '../db/reset-demo';
import { resetScenarioBaselineOnce } from '../db/startup-reset';
import { shouldResetDemoDatabaseOnStartup } from '../db/startup-policy';

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig();

  if (shouldResetDemoDatabaseOnStartup(config)) {
    await resetScenarioBaselineOnce(() =>
      resetDemoDatabase(config.dbPath, { resetDocuments: true })
    );
    return;
  }

  const { db, sqlite } = getDbClient(config.dbPath);

  runMigrations(sqlite);
  void db;
});
