import { fileURLToPath } from 'node:url';
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ApiResponse } from '../../shared/contracts/api';
import type {
  FlightOperationRecord,
  FlightRequestRecord
} from '../../shared/contracts/flight-operations';
import { resetDemoDatabase } from '../../server/db/reset-demo';

process.env.DEMO_MODE = 'true';
const testDbPath = './data/test-flight-operations-api.sqlite';
process.env.AMA_DB_PATH = testDbPath;

beforeAll(async () => {
  await resetDemoDatabase(testDbPath);
});

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: true,
  browser: false
});

describe('flight request APIs', () => {
  it('keeps the created request ID available through submit and decision', async () => {
    const created = await $fetch<ApiResponse<FlightRequestRecord>>(
      '/api/flight-operations/requests',
      {
        method: 'POST',
        body: {
          flightDate: '2026-07-15',
          flightTypeId: 'flight-type-cargo',
          serviceTypeId: 'flight-service-type-charter-cargo',
          routeId: 'route-djj-wmx',
          customerId: 'cust-papua-logistics',
          aircraftId: 'ac-pk-ama',
          pilotInCommandId: 'crew-pic-valid',
          coPilotId: 'crew-cop-valid',
          scheduledDepartureAt: '2026-07-14T23:30:00.000Z',
          scheduledArrivalAt: '2026-07-15T00:45:00.000Z',
          requestSource: 'API integration test',
          priorityId: 'flight-priority-normal',
          passengerEstimate: 2,
          cargoWeightEstimateKg: 640,
          cargoCategory: 'General Cargo',
          dangerousGoods: false,
          fuelType: 'AVTUR',
          requestedFuelLitre: 850,
          fuelSupplierId: 'fuel-pertamina-djj',
          handlingSupplierId: 'hp-angkasa-djj',
          parkingRequired: true,
          destinationHandlingRequired: true,
          billingType: 'CHARTER',
          estimatedRevenue: 28000000,
          remarks: 'Create, submit, and decide through Nitro'
        }
      }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error.message);

    const submitted = await $fetch<ApiResponse<FlightRequestRecord>>(
      `/api/flight-operations/requests/${created.data.id}/actions/submit`,
      { method: 'POST' }
    );
    expect(submitted.ok && submitted.data.id).toBe(created.data.id);
    expect(submitted.ok && submitted.data.status).toBe('SUBMITTED');

    const decided = await $fetch<
      ApiResponse<{ request: FlightRequestRecord; flight: FlightOperationRecord | null }>
    >(`/api/flight-operations/requests/${created.data.id}/actions/decision`, {
      method: 'POST',
      headers: { cookie: 'ama_demo_role=Director' },
      body: { decision: 'APPROVE', reason: 'Approved by integration test.' }
    });

    expect(decided.ok).toBe(true);
    if (!decided.ok) throw new Error(decided.error.message);
    expect(decided.data.request).toMatchObject({ id: created.data.id, status: 'CONVERTED' });
    expect(decided.data.flight?.flightRequestId).toBe(created.data.id);
  });
});
