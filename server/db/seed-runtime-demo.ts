import type Database from 'better-sqlite3';
import type { AppDatabase } from './client';
import { seedDemoData } from './seed';
import { seedFlightOperationsData } from './seed-flight-operations';
import { seedCorporateAssets } from './seeds/corporate-assets';
import { seedInventoryData } from './seeds/inventory';
import { seedTicketingData } from './seeds/ticketing';

export async function seedRuntimeDemoData(db: AppDatabase, sqlite: Database.Database) {
  const { count } = sqlite.prepare('SELECT COUNT(*) as count FROM aircraft').get() as {
    count: number;
  };

  if (count === 0) {
    await seedDemoData(db);
  }

  seedFlightOperationsData(sqlite);
  seedTicketingData(sqlite);
  seedInventoryData(sqlite);
  seedCorporateAssets(sqlite);
}
