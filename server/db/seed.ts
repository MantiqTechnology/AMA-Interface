import type { AppDatabase } from './client';
import { seedCargoMasterData } from './seeds/master-data/cargo';
import { seedCommercialMasterData } from './seeds/master-data/commercial';
import { seedFinanceMasterData } from './seeds/master-data/finance';
import { seedOperationsMasterData } from './seeds/master-data/operations';
import { createDemoSeedContext, type DemoSeedContext } from './seeds/context';

export async function seedDemoData(
  db: AppDatabase,
  context: DemoSeedContext = createDemoSeedContext()
) {
  await seedOperationsMasterData(db, context);
  await seedFinanceMasterData(db, context);
  await seedCommercialMasterData(db, context);
  await seedCargoMasterData(db, context);
}
