import { createDbClient } from '../../server/db/client';
import { dropDemoDatabase, runMigrations } from '../../server/db/migrate';
import { seedDemoData } from '../../server/db/seed';
import { seedFlightOperationsData } from '../../server/db/seed-flight-operations';
import { SqliteMasterDataRepository } from '../../server/repositories/master-data.repository';
import { createSqliteRepositories } from '../../server/repositories/sqlite-repositories';
import { createServices } from '../../server/services';

export async function createSeededTestServices() {
  const client = createDbClient(':memory:');
  dropDemoDatabase(client.sqlite);
  runMigrations(client.sqlite);
  await seedDemoData(client.db);
  seedFlightOperationsData(client.sqlite);

  return {
    ...client,
    services: createServices(
      createSqliteRepositories(client.db),
      new SqliteMasterDataRepository(client.sqlite),
      client.sqlite
    )
  };
}
