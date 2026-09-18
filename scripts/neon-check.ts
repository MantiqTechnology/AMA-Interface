import { createPostgresPool } from '../server/db/postgres/client';
import { loadLocalEnv } from './load-env';

loadLocalEnv();

const expectedCounts = {
  stations: 10,
  flight_operations: 19,
  flight_station_tasks: 130,
  flight_station_service_requests: 12,
  flight_station_costs: 11
};
const verifyBaseline = process.argv.includes('--baseline');

const pool = createPostgresPool('runtime');
try {
  const result = await pool.query<{
    database: string;
    version: string;
    stations: string;
    flight_operations: string;
    flight_station_tasks: string;
    flight_station_service_requests: string;
    flight_station_costs: string;
  }>(`SELECT current_database() AS database, version() AS version,
      (SELECT count(*) FROM stations)::text AS stations,
      (SELECT count(*) FROM flight_operations)::text AS flight_operations,
      (SELECT count(*) FROM flight_station_tasks)::text AS flight_station_tasks,
      (SELECT count(*) FROM flight_station_service_requests)::text AS flight_station_service_requests,
      (SELECT count(*) FROM flight_station_costs)::text AS flight_station_costs`);
  const row = result.rows[0];
  if (!row) throw new Error('Neon health query returned no result.');

  if (verifyBaseline) {
    for (const [table, expected] of Object.entries(expectedCounts)) {
      if (Number(row[table as keyof typeof expectedCounts]) !== expected) {
        throw new Error(`Neon baseline mismatch for ${table}: expected ${expected}.`);
      }
    }
  }

  console.log(
    JSON.stringify({ ...row, baseline: verifyBaseline ? 'verified' : 'not-checked' }, null, 2)
  );
} finally {
  await pool.end();
}
