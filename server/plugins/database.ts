import { getDbClient } from '../db/client';
import { runMigrations } from '../db/migrate';
import { resetDemoDatabase } from '../db/reset-demo';
import { seedScenarioDatabase } from '../db/seeds/scenario-database';
import { resetScenarioBaselineOnce } from '../db/startup-reset';
import {
  shouldResetDemoDatabaseOnStartup,
  shouldSeedDemoDatabaseOnStartup
} from '../db/startup-policy';

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

  const flightCount = sqlite.prepare('SELECT COUNT(*) AS count FROM flight_operations').get() as {
    count: number;
  };
  if (flightCount.count === 0 && shouldSeedDemoDatabaseOnStartup(config)) {
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
