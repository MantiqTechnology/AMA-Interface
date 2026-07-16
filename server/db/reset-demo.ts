import { createDbClient } from './client';
import { dropDemoDatabase, runMigrations } from './migrate';
import { seedDemoData } from './seed';
import { seedFlightOperationsData } from './seed-flight-operations';
import { seedTicketingData } from './seeds/ticketing';
import { seedInventoryData } from './seeds/inventory';

export async function resetDemoDatabase(dbPath: string) {
  const { db, sqlite } = createDbClient(dbPath);

  try {
    dropDemoDatabase(sqlite);
    runMigrations(sqlite);
    await seedDemoData(db);
    seedFlightOperationsData(sqlite);
    seedTicketingData(sqlite);
    seedInventoryData(sqlite);
  } finally {
    sqlite.close();
  }
}
