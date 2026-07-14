import type { AppDatabase } from './client';
import { seedCargoMasterData } from './seeds/master-data/cargo';
import { seedCommercialMasterData } from './seeds/master-data/commercial';
import { seedFinanceMasterData } from './seeds/master-data/finance';
import { seedOperationsMasterData } from './seeds/master-data/operations';

export async function seedDemoData(db: AppDatabase) {
  await seedOperationsMasterData(db);
  await seedFinanceMasterData(db);
  await seedCommercialMasterData(db);
  await seedCargoMasterData(db);
}
