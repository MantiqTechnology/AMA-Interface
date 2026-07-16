import { createDbClient } from '../../server/db/client';
import { dropDemoDatabase, runMigrations } from '../../server/db/migrate';
import { seedDemoData } from '../../server/db/seed';
import { seedFlightOperationsData } from '../../server/db/seed-flight-operations';
import { seedTicketingData } from '../../server/db/seeds/ticketing';
import { seedInventoryData } from '../../server/db/seeds/inventory';
import { createServices } from '../../server/services';

export async function createSeededTestServices() {
  const client = createDbClient(':memory:');
  dropDemoDatabase(client.sqlite);
  runMigrations(client.sqlite);
  await seedDemoData(client.db);
  seedFlightOperationsData(client.sqlite);
  seedTicketingData(client.sqlite);
  seedInventoryData(client.sqlite);

  return {
    ...client,
    services: createServices(client.sqlite)
  };
}
