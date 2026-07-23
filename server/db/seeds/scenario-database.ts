import type { DbClient } from '../client';
import { seedDemoData } from '../seed';
import { seedFlightOperationsData } from '../seed-flight-operations';
import { migrateVerificationData } from '../migrations/operations/verification-migration';
import { resetAndSeedLocalDocuments } from '../../utils/local-document-storage';
import { createDemoSeedContext, type DemoSeedContext } from './context';
import { assertScenarioSeedIntegrity } from './integrity';
import { seedInventoryData } from './inventory';
import { seedTicketingData } from './ticketing';
import { seedAccountingScenarioData } from './accounting-scenarios';
import { seedCorporateAssets } from './corporate-assets';
import { seedVerificationScenarios } from './verification-scenarios';

export type SeedScenarioDatabaseOptions = {
  context?: DemoSeedContext;
  resetDocuments?: boolean;
};

export async function seedScenarioDatabase(
  client: DbClient,
  options: SeedScenarioDatabaseOptions = {}
) {
  const context = options.context ?? createDemoSeedContext();

  await seedDemoData(client.db, context);
  const seedScenarios = client.sqlite.transaction(() => {
    seedFlightOperationsData(client.sqlite, context);
    seedTicketingData(client.sqlite, context);
    seedInventoryData(client.sqlite, context);
    seedCorporateAssets(client.sqlite, context);
    seedAccountingScenarioData(client.sqlite, context);
    assertScenarioSeedIntegrity(client.sqlite, context);
  });
  seedScenarios.immediate();

  // Initialize verification workbench for seeded flights and enrich with demo scenarios
  await migrateVerificationData(client.sqlite);
  seedVerificationScenarios(client.sqlite);

  if (options.resetDocuments) {
    await resetAndSeedLocalDocuments(context);
  }
}
