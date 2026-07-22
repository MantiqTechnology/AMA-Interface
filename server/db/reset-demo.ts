import { createDbClient } from './client';
import { dropDemoDatabase, runMigrations } from './migrate';
import { createDemoSeedContext } from './seeds/context';
import { seedScenarioDatabase } from './seeds/scenario-database';

export type ResetDemoDatabaseOptions = {
  anchorDate?: string;
  resetDocuments?: boolean;
};

export async function resetDemoDatabase(dbPath: string, options: ResetDemoDatabaseOptions = {}) {
  const { db, sqlite } = createDbClient(dbPath);
  const context = createDemoSeedContext(options.anchorDate);

  try {
    dropDemoDatabase(sqlite);
    runMigrations(sqlite);
    await seedScenarioDatabase(
      { db, sqlite },
      {
        context,
        resetDocuments: options.resetDocuments ?? process.env.NODE_ENV !== 'test'
      }
    );
  } finally {
    sqlite.close();
  }
}
