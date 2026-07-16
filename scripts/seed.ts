import { createDbClient } from '../server/db/client';
import { runMigrations } from '../server/db/migrate';
import { seedDemoData } from '../server/db/seed';
import { seedFlightOperationsData } from '../server/db/seed-flight-operations';
import { seedTicketingData } from '../server/db/seeds/ticketing';
import { seedInventoryData } from '../server/db/seeds/inventory';

const dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite';
const { db, sqlite } = createDbClient(dbPath);

runMigrations(sqlite);
await seedDemoData(db);
seedFlightOperationsData(sqlite);
seedTicketingData(sqlite);
seedInventoryData(sqlite);
sqlite.close();

console.log(`Seeded fictional PT AMA demo data at ${dbPath}`);
