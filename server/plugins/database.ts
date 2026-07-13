import { getDbClient } from '../db/client';
import { runMigrations } from '../db/migrate';
import { seedDemoData } from '../db/seed';
import { seedFlightOperationsData } from '../db/seed-flight-operations';
import { seedTicketingData } from '../db/seeds/ticketing';

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig();
  const { db, sqlite } = getDbClient(config.dbPath);

  runMigrations(sqlite);

  const { count } = sqlite.prepare('SELECT COUNT(*) as count FROM aircraft').get() as {
    count: number;
  };
  if (count === 0) {
    await seedDemoData(db);
  }

  seedFlightOperationsData(sqlite);
  seedTicketingData(sqlite);
});
