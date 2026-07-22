import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ApiResponse } from '../../shared/contracts/api';
import type {
  AccountingJournalDetail,
  JournalEntryDto
} from '../../shared/features/finance/accounting';
import { resolveDbPath } from '../../server/db/client';
import { resetDemoDatabase } from '../../server/db/reset-demo';

process.env.DEMO_MODE = 'true';
const testDbPath = './data/test-accounting-api.sqlite';
process.env.AMA_DB_PATH = testDbPath;

beforeAll(async () => {
  const resolved = resolveDbPath(process.env.AMA_DB_PATH);
  await Promise.all([
    rm(resolved, { force: true }),
    rm(`${resolved}-wal`, { force: true }),
    rm(`${resolved}-shm`, { force: true })
  ]);
  await resetDemoDatabase(testDbPath);
});

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: true,
  browser: false,
  setupTimeout: 300_000
});

describe('accounting journal detail API', () => {
  it('returns a typed balanced detail read model for an authorized user', async () => {
    const list = await $fetch<ApiResponse<JournalEntryDto[]>>('/api/finance/accounting/journals', {
      headers: { cookie: 'ama_demo_role=Finance%20Reviewer' }
    });
    expect(list.ok).toBe(true);
    const posted = list.ok && list.data.find((journal) => journal.status === 'POSTED');
    expect(posted).toBeTruthy();

    const response = await $fetch<ApiResponse<AccountingJournalDetail>>(
      `/api/finance/accounting/journals/${posted && posted.id}`,
      { headers: { cookie: 'ama_demo_role=Finance%20Reviewer' } }
    );
    expect(response.ok).toBe(true);
    expect(response.ok && response.data.totals.balanced).toBe(true);
    expect(response.ok && response.data.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('enforces view permission and returns not found without leaking data', async () => {
    const forbidden = await $fetch<ApiResponse<unknown>>(
      '/api/finance/accounting/journals/journal-does-not-matter',
      {
        headers: { cookie: 'ama_demo_role=OCC' },
        ignoreResponseError: true
      }
    );
    expect(!forbidden.ok && forbidden.error.code).toBe('FORBIDDEN');

    const missing = await $fetch<ApiResponse<unknown>>(
      '/api/finance/accounting/journals/journal-missing',
      {
        headers: { cookie: 'ama_demo_role=Finance%20Reviewer' },
        ignoreResponseError: true
      }
    );
    expect(!missing.ok && missing.error.code).toBe('NOT_FOUND');
  });
});
