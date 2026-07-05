import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ApiResponse } from '../../shared/contracts/api';
import type { FlightSummaryDto } from '../../shared/contracts/flights';
import { createDbClient, resolveDbPath } from '../../server/db/client';
import { dropDemoDatabase, runMigrations } from '../../server/db/migrate';
import { seedDemoData } from '../../server/db/seed';

process.env.DEMO_MODE = 'true';
process.env.AMA_DB_PATH = './data/test-api.sqlite';

beforeAll(async () => {
  const resolved = resolveDbPath(process.env.AMA_DB_PATH);
  await rm(resolved, { force: true });
  await rm(`${resolved}-wal`, { force: true });
  await rm(`${resolved}-shm`, { force: true });

  const { db, sqlite } = createDbClient(process.env.AMA_DB_PATH);
  dropDemoDatabase(sqlite);
  runMigrations(sqlite);
  await seedDemoData(db);
  sqlite.close();
});

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: true,
  browser: false
});

describe('GET /api/flights', () => {
  it('returns the seeded flight list in the standard envelope', async () => {
    const response = await $fetch<ApiResponse<FlightSummaryDto[]>>('/api/flights');

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.error.message);
    expect(response.data.length).toBeGreaterThanOrEqual(4);
    expect(response.data[0]).toHaveProperty('flightNumber');
    expect(response.meta?.demoMode).toBe(true);
  });
});
