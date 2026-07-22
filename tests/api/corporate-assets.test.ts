import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ApiResponse } from '../../shared/contracts/api';
import { resetDemoDatabase } from '../../server/db/reset-demo';

process.env.DEMO_MODE = 'true';
const testDbPath = './data/test-corporate-assets-api.sqlite';
process.env.AMA_DB_PATH = testDbPath;
const role = (name: string) => ({ cookie: `ama_demo_role=${encodeURIComponent(name)}` });

beforeAll(async () => resetDemoDatabase(testDbPath));
afterAll(() => rmSync(testDbPath, { force: true }));

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: true,
  browser: false,
  setupTimeout: 300_000
});

describe('Corporate Assets APIs', () => {
  it('hides the module from OCC and applies Station Admin scope', async () => {
    const denied = await $fetch<ApiResponse<unknown>>('/api/asset-management/assets', {
      headers: role('OCC'),
      ignoreResponseError: true
    });
    expect(!denied.ok && denied.error.code).toBe('FORBIDDEN');

    const scoped = await $fetch<ApiResponse<any>>('/api/asset-management/assets', {
      headers: role('Station Admin')
    });
    expect(scoped.ok && scoped.data.items.map((item: any) => item.stationCode)).toEqual(['WMX']);
  });

  it('keeps financial projection read-only and permission-gated', async () => {
    const director = await $fetch<ApiResponse<any>>(
      '/api/asset-management/assets/asset-gse-gpu-01',
      { headers: role('Director') }
    );
    expect(director.ok && director.data.financial.assetNumber).toBe('FA-GSE-00001');
    const maintenance = await $fetch<ApiResponse<any>>(
      '/api/asset-management/assets/asset-gse-gpu-01',
      { headers: role('Maintenance Manager') }
    );
    expect(maintenance.ok && maintenance.data.financial).toEqual({
      financialStatus: 'NOT_CAPITALIZED'
    });
    const denied = await $fetch<ApiResponse<unknown>>(
      '/api/asset-management/assets/asset-gse-gpu-01/actions/move',
      {
        method: 'POST',
        headers: role('Director'),
        body: {},
        ignoreResponseError: true
      }
    );
    expect(!denied.ok && denied.error.code).toBe('FORBIDDEN');
  });

  it('returns current concurrency tokens on stale mutations', async () => {
    const result = await $fetch<ApiResponse<any>>(
      '/api/asset-management/assets/asset-it-laptop-01/actions/assign',
      {
        method: 'POST',
        headers: role('Demo Admin'),
        ignoreResponseError: true,
        body: {
          expectedVersion: 99,
          expectedUpdatedAt: '2000-01-01T00:00:00.000Z',
          employeeId: 'emp-anisa',
          custodianNameSnapshot: 'Anisa Putri',
          departmentId: 'dept-it',
          reason: 'Concurrency API check.',
          startedAt: '2026-07-22T10:00:00.000Z'
        }
      }
    );
    expect(!result.ok && result.error.code).toBe('ASSET_VERSION_CONFLICT');
    expect(!result.ok && result.error.details).toMatchObject({
      currentVersion: 1,
      currentUpdatedAt: expect.any(String)
    });
  });

  it('exposes Employee and Department master options to asset readers', async () => {
    const departments = await $fetch<ApiResponse<any[]>>('/api/master-data/departments/options', {
      headers: role('Maintenance Manager')
    });
    const employees = await $fetch<ApiResponse<any[]>>('/api/master-data/employees/options', {
      headers: role('Maintenance Manager')
    });
    expect(departments.ok && departments.data.some((item) => item.departmentCode === 'OPS')).toBe(
      true
    );
    expect(employees.ok && employees.data.some((item) => item.employeeCode === 'EMP-MNT-001')).toBe(
      true
    );
  });
});
