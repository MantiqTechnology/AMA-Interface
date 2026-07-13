import { createDbClient } from '../../server/db/client';
import { dropDemoDatabase, runMigrations } from '../../server/db/migrate';
import { seedDemoData } from '../../server/db/seed';

export async function createSeededMasterDataDb() {
  const client = createDbClient(':memory:');
  dropDemoDatabase(client.sqlite);
  runMigrations(client.sqlite);
  await seedDemoData(client.db);
  return client;
}
