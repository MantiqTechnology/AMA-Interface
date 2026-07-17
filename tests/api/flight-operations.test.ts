import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ApiResponse } from '../../shared/contracts/api';
import type {
  FlightMaintenanceHandoffDto,
  FlightOperationOverviewDto,
  FlightOperationRecord,
  FlightRequestRecord
} from '../../shared/contracts/flight-operations';
import type { InvoiceDetailDto, InvoiceSummaryDto } from '../../shared/features/finance/invoices';
import { resolveDbPath } from '../../server/db/client';
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
  browser: false,
  setupTimeout: 300_000
});

describe('flight request APIs', () => {
  it('returns the nearest upcoming non-terminal assignment for an aircraft', async () => {
    const response = await $fetch<ApiResponse<FlightOperationOverviewDto>>(
      '/api/flight-operations/flights',
      {
        query: {
          aircraftId: 'ac-pk-ama',
          scheduledFrom: '2026-07-16T00:00:00.000+09:00',
          excludeTerminal: true,
          sortDirection: 'asc',
          limit: 1
        }
      }
    );

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.error.message);
    expect(response.data.flights.map((flight) => flight.id)).toEqual(['fop-ticketing-passenger']);
  });

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

  it('lists, recovers, and approves an idempotent finance handoff', async () => {
    const emptyQuery = await $fetch<ApiResponse<InvoiceSummaryDto[]>>(
      '/api/invoices?status&customerId&flightId&due&search'
    );
    expect(emptyQuery.ok).toBe(true);
    expect(emptyQuery.ok && emptyQuery.data.length).toBeGreaterThan(0);

    const detail = await $fetch<ApiResponse<InvoiceDetailDto>>('/api/invoices/inv-closed-djj-wmx');
    expect(detail.ok && detail.data.lineItems).toHaveLength(1);
    expect(detail.ok && detail.data.finance.grossMargin).toBe(16_000_000);
    expect(detail.ok && detail.data.lineItems[0]?.taxCode).toBe('PPN_DEMO');
    expect(detail.ok && detail.data.tax).toBe(3_080_000);

    const database = new Database(resolveDbPath(testDbPath));
    database
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-closed', is_locked = 1
         WHERE id = 'fop-ticketing-cargo'`
      )
      .run();
    database.close();

    const denied = await $fetch<ApiResponse<InvoiceDetailDto>>('/api/finance/handoffs/process', {
      method: 'POST',
      headers: { cookie: 'ama_demo_role=OCC' },
      body: { flightId: 'fop-ticketing-cargo' },
      ignoreResponseError: true
    });
    expect(!denied.ok && denied.error.code).toBe('FORBIDDEN');

    const recovered = await $fetch<ApiResponse<InvoiceDetailDto>>('/api/finance/handoffs/process', {
      method: 'POST',
      body: { flightId: 'fop-ticketing-cargo' }
    });
    const retried = await $fetch<ApiResponse<InvoiceDetailDto>>('/api/finance/handoffs/process', {
      method: 'POST',
      body: { flightId: 'fop-ticketing-cargo' }
    });
    expect(recovered.ok).toBe(true);
    expect(retried.ok).toBe(true);
    if (!recovered.ok || !retried.ok) throw new Error('Expected finance recovery to succeed.');
    expect(retried.data.id).toBe(recovered.data.id);

    const filtered = await $fetch<ApiResponse<InvoiceSummaryDto[]>>('/api/invoices', {
      query: { status: 'draft', flightId: 'fop-ticketing-cargo', due: 'all' }
    });
    expect(filtered.ok && filtered.data.map((invoice) => invoice.id)).toEqual([recovered.data.id]);

    const directorApproval = await $fetch<ApiResponse<InvoiceDetailDto>>(
      `/api/invoices/${recovered.data.id}/actions/approve`,
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=Director' },
        body: {},
        ignoreResponseError: true
      }
    );
    expect(!directorApproval.ok && directorApproval.error.code).toBe('FORBIDDEN');

    const approved = await $fetch<ApiResponse<InvoiceDetailDto>>(
      `/api/invoices/${recovered.data.id}/actions/approve`,
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=Finance%20Reviewer' },
        body: {}
      }
    );
    expect(approved.ok && approved.data.status).toBe('issued');
    expect(approved.ok && approved.data.approvedByUserId).toBe('USR-FINANCE-REVIEWER');
  });

  it('serves the maintenance handoff workbench with filters and permissioned approval', async () => {
    const list = await $fetch<ApiResponse<FlightMaintenanceHandoffDto[]>>(
      '/api/flight-operations/maintenance'
    );
    expect(list.ok).toBe(true);
    if (!list.ok) throw new Error(list.error.message);
    expect(list.data).toContainEqual(
      expect.objectContaining({
        id: 'fop-in-progress-maintenance-draft',
        flightNumber: 'AMA-20260707-005',
        routeCode: 'WMX-OKS',
        currentStatus: 'IN_PROGRESS',
        pendingApproval: true,
        evidenceComplete: false,
        blockers: expect.arrayContaining([
          'Maintenance approval is missing',
          'Work order evidence has not been recorded'
        ]),
        handoffServiceabilityStatus: 'SERVICEABLE_WITH_RESTRICTIONS',
        serviceabilityStatus: 'SERVICEABLE',
        approvedMaintenanceCost: 0,
        totalOperationalCost: 12000000,
        projectedGrossMargin: 6500000
      })
    );

    const filtered = await $fetch<ApiResponse<FlightMaintenanceHandoffDto[]>>(
      '/api/flight-operations/maintenance',
      { query: { search: 'PK-AMB', status: 'DRAFT', stationId: 'st-wmx' } }
    );
    expect(filtered.ok && filtered.data.map((item) => item.id)).toEqual([
      'fop-in-progress-maintenance-draft'
    ]);

    const operationalFilter = await $fetch<ApiResponse<FlightMaintenanceHandoffDto[]>>(
      '/api/flight-operations/maintenance',
      { query: { date: '2026-07-07', serviceability: 'SERVICEABLE' } }
    );
    expect(operationalFilter.ok && operationalFilter.data.map((item) => item.id)).toContain(
      'fop-in-progress-maintenance-draft'
    );

    const invalidDate = await $fetch<ApiResponse<unknown>>('/api/flight-operations/maintenance', {
      query: { date: '2026-99-99' },
      ignoreResponseError: true
    });
    expect(!invalidDate.ok && invalidDate.error.code).toBe('VALIDATION_ERROR');

    const denied = await $fetch<ApiResponse<unknown>>(
      '/api/flight-operations/maintenance/fop-in-progress-maintenance-draft/actions/approve',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=OCC' },
        ignoreResponseError: true
      }
    );
    expect(!denied.ok && denied.error.code).toBe('FORBIDDEN');

    const approved = await $fetch<ApiResponse<unknown>>(
      '/api/flight-operations/maintenance/fop-in-progress-maintenance-draft/actions/approve',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=Maintenance%20Manager' }
      }
    );
    expect(approved.ok).toBe(true);
    const refreshed = await $fetch<ApiResponse<FlightMaintenanceHandoffDto[]>>(
      '/api/flight-operations/maintenance',
      { query: { search: 'AMA-20260707-005' } }
    );
    expect(refreshed.ok && refreshed.data[0]).toMatchObject({
      id: 'fop-in-progress-maintenance-draft',
      status: 'APPROVED'
    });

    const repeated = await $fetch<ApiResponse<unknown>>(
      '/api/flight-operations/maintenance/fop-in-progress-maintenance-draft/actions/approve',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
        ignoreResponseError: true
      }
    );
    expect(!repeated.ok && repeated.error.code).toBe('INVALID_TRANSITION');
  });
});
