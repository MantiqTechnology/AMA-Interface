import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createDbClient } from '../server/db/client';
import { runMigrations } from '../server/db/migrate';

const dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite';
const exportPath =
  process.env.AMA_EXPORT_PATH ??
  join(process.cwd(), 'data', `ama-demo-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

const { sqlite } = createDbClient(dbPath);
runMigrations(sqlite);

const tables = [
  'aircraft',
  'stations',
  'routes',
  'customers',
  'flight_orders',
  'manifests',
  'fuel_requests',
  'fuel_uplifts',
  'station_expenses',
  'maintenance_work_orders',
  'serialized_parts',
  'invoices',
  'payments',
  'approvals',
  'alerts'
];

const payload = Object.fromEntries(
  tables.map((table) => [table, sqlite.prepare(`SELECT * FROM ${table}`).all()])
);

await mkdir(dirname(exportPath), { recursive: true });
await writeFile(exportPath, JSON.stringify(payload, null, 2));
sqlite.close();

console.log(`Exported AMA demo data to ${exportPath}`);
