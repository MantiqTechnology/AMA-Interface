import { fileURLToPath } from 'node:url';
import { rm } from 'node:fs/promises';
import Database from 'better-sqlite3';
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ApiResponse } from '../../shared/contracts/api';
import type { InventoryMaintenanceDemandDto } from '../../shared/features/inventory';
import type {
  InternalAogDemoDto,
  MaintenanceCommandCenterDto,
  MaintenanceSelectorDataDto,
  MaintenanceTechnicalRecordPackageDto,
  MaintenanceWorkPackageDto
} from '../../shared/features/maintenance';
import { resolveDbPath } from '../../server/db/client';
import { resetDemoDatabase } from '../../server/db/reset-demo';

process.env.DEMO_MODE = 'true';
process.env.DEMO_SEED_DATE = '2026-08-01';
const testDbPath = './data/test-maintenance-api.sqlite';
process.env.AMA_DB_PATH = testDbPath;

beforeAll(async () => {
  await resetDemoDatabase(testDbPath);
});

afterAll(async () => {
  delete process.env.DEMO_SEED_DATE;
  const resolved = resolveDbPath(testDbPath);
  await rm(resolved, { force: true });
  await rm(`${resolved}-wal`, { force: true });
  await rm(`${resolved}-shm`, { force: true });
});

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: true,
  browser: false,
  setupTimeout: 300_000
});

describe('maintenance command-center APIs', () => {
  it.each([
    'Maintenance Manager',
    'Maintenance Technician',
    'Certifying Staff',
    'Inventory Controller'
  ])('lets %s read the Internal AOG scenario snapshot', async (role) => {
    const response = await $fetch<ApiResponse<InternalAogDemoDto>>(
      '/api/maintenance/demo/internal-aog',
      { headers: { cookie: `ama_demo_role=${encodeURIComponent(role)}` } }
    );

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.error.message);
    expect(response.data).toMatchObject({
      scenarioId: 'INTERNAL_AOG_MATERIAL',
      workPackage: { id: 'mroaog-work-package' },
      aircraft: { registrationNumber: 'PK-AMD' }
    });
  });

  it('restricts reset to the Maintenance Manager and restores a partially-run scenario', async () => {
    const inventoryCookie = 'ama_demo_role=Inventory%20Controller';
    const managerCookie = 'ama_demo_role=Maintenance%20Manager';
    const demand = await $fetch<ApiResponse<InventoryMaintenanceDemandDto[]>>(
      '/api/inventory/maintenance-demand',
      {
        headers: { cookie: inventoryCookie }
      }
    );
    expect(demand.ok).toBe(true);
    if (!demand.ok) throw new Error(demand.error.message);
    const scenarioDemand = demand.data.find(
      (row) => row.requirement.id === 'mroaog-material-requirement'
    );
    const candidate = scenarioDemand?.candidates[0];
    expect(candidate).toBeTruthy();

    await $fetch('/api/inventory/maintenance-demand/reservations', {
      method: 'POST',
      headers: { cookie: inventoryCookie },
      body: {
        materialRequirementId: 'mroaog-material-requirement',
        inventoryItemId: candidate!.inventoryItemId,
        lotNumber: candidate!.lotNumber ?? undefined,
        quantity: 1,
        unit: scenarioDemand!.requirement.unit,
        stationId: candidate!.stationId,
        inventoryLocationId: candidate!.binId,
        certificateReference: candidate!.certificateReference ?? undefined,
        idempotencyKey: 'api-mroaog-partial-reserve'
      }
    });

    const partial = await $fetch<ApiResponse<InternalAogDemoDto>>(
      '/api/maintenance/demo/internal-aog',
      { headers: { cookie: inventoryCookie } }
    );
    expect(partial.ok && partial.data.phase).toBe('MATERIAL_RESERVED');

    const forbidden = await $fetch<ApiResponse<unknown>>(
      '/api/maintenance/demo/internal-aog/reset',
      {
        method: 'POST',
        headers: { cookie: inventoryCookie },
        ignoreResponseError: true
      }
    );
    expect(forbidden.ok).toBe(false);
    if (forbidden.ok) throw new Error('Inventory Controller unexpectedly reset the scenario.');
    expect(forbidden.error.code).toBe('FORBIDDEN');

    const reset = await $fetch<ApiResponse<{ resetAt: string; scenario: InternalAogDemoDto }>>(
      '/api/maintenance/demo/internal-aog/reset',
      {
        method: 'POST',
        headers: { cookie: managerCookie }
      }
    );
    expect(reset.ok).toBe(true);
    if (!reset.ok) throw new Error(reset.error.message);
    expect(reset.data.scenario).toMatchObject({
      phase: 'MATERIAL_REQUIRED',
      materialRequirement: { reservedQuantity: 0, issuedQuantity: 0 }
    });
  });

  it('returns authoritative seeded MRO queues without client-side placeholder metrics', async () => {
    const response = await $fetch<ApiResponse<MaintenanceCommandCenterDto>>(
      '/api/maintenance/command-center',
      { headers: { cookie: 'ama_demo_role=Maintenance%20Manager' } }
    );

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.error.message);
    expect(response.data.summary.readyForRelease).toBeGreaterThanOrEqual(1);
    expect(response.data.readyForRelease).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packageNumber: 'MWP-MROV1-RTS',
          aircraftRegistrationNumber: 'PK-MRA',
          status: 'READY_FOR_RELEASE'
        })
      ])
    );
    expect(response.data.inspectionsAwaitingAction).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardNumber: 'MWP-MROV1-ACTIVE-JC-001',
          aircraftRegistrationNumber: 'PK-AMC'
        })
      ])
    );
    expect(response.data.operationalAttention).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          aircraftRegistrationNumber: 'PK-MRA',
          activePackageNumber: 'MWP-MROV1-RTS',
          owner: 'Certifying Staff'
        })
      ])
    );
    expect(response.data.authorizationNotice).toContain('PT AMA authorization verified');
  });

  it('returns repository-compatible selectors for contextual creation and signer licence state', async () => {
    const manager = await $fetch<ApiResponse<MaintenanceSelectorDataDto>>(
      '/api/maintenance/selector-data',
      { headers: { cookie: 'ama_demo_role=Maintenance%20Manager' } }
    );
    expect(manager.ok).toBe(true);
    if (!manager.ok) throw new Error(manager.error.message);
    expect(manager.data.aircraft).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          registrationNumber: 'PK-MRB',
          serviceabilityStatus: 'UNSERVICEABLE'
        })
      ])
    );
    expect(manager.data.eligibleDefects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          defectNumber: 'DEF-MROV1-MRB-001',
          aircraftRegistrationNumber: 'PK-MRB',
          activeWorkPackageId: null
        })
      ])
    );
    expect(
      manager.data.eligibleDefects.some((defect) => defect.defectNumber === 'DEF-MROV1-MRA-001')
    ).toBe(false);

    const certifier = await $fetch<ApiResponse<MaintenanceSelectorDataDto>>(
      '/api/maintenance/selector-data',
      { headers: { cookie: 'ama_demo_role=Certifying%20Staff' } }
    );
    expect(certifier.ok).toBe(true);
    if (!certifier.ok) throw new Error(certifier.error.message);
    expect(certifier.data.signerLicenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          licenseNumber: 'AME-CERT-MRO-001',
          status: 'ACTIVE',
          isUsableNow: true
        }),
        expect.objectContaining({
          licenseNumber: 'AME-CERT-MRO-EXPIRED',
          status: 'EXPIRED',
          isUsableNow: false
        })
      ])
    );
  });

  it('treats blank list filters from cleared UI controls as an unfiltered work-package query', async () => {
    const response = await $fetch<ApiResponse<{ items: MaintenanceWorkPackageDto[] }>>(
      '/api/maintenance/work-packages',
      {
        headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
        query: { status: '', search: '', limit: 50, offset: 0 },
        ignoreResponseError: true
      }
    );

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.error.message);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packageNumber: 'MWP-MROV1-RTS',
          status: 'READY_FOR_RELEASE',
          aircraftType: 'Cessna Caravan 208B',
          jobCards: expect.arrayContaining([
            expect.objectContaining({
              cardNumber: 'MWP-MROV1-RTS-JC-001',
              status: 'READY_FOR_RELEASE_REVIEW'
            })
          ]),
          releaseChecklist: expect.objectContaining({
            mandatoryWorkComplete: true,
            independentInspectionsComplete: true,
            approvedDataAvailable: true
          })
        })
      ])
    );
  });

  it('filters audit records by work-package reference across package, job-card, and defect events', async () => {
    const response = await $fetch<
      ApiResponse<{
        items: Array<{
          entityType: string;
          action: string;
          requestId: string | null;
          metadata: Record<string, unknown>;
        }>;
        total: number;
      }>
    >('/api/maintenance/records', {
      headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
      query: { package: 'MWP-MROV1-RTS', limit: 50, offset: 0 },
      ignoreResponseError: true
    });

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.error.message);
    expect(response.data.total).toBeGreaterThan(0);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: 'WORK_PACKAGE' }),
        expect.objectContaining({ entityType: 'JOB_CARD' }),
        expect.objectContaining({ entityType: 'DEFECT' })
      ])
    );
    expect(response.data.items.some((item) => item.action === 'TECHNICAL_RELEASE')).toBe(false);
  });

  it('rejects unsafe work-package creation contexts before writing package records', async () => {
    const linkedDefect = await $fetch<ApiResponse<unknown>>('/api/maintenance/work-packages', {
      method: 'POST',
      headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
      body: {
        aircraftId: 'ac-pk-mra',
        primaryDefectId: 'adefect-mrov1-release',
        title: 'Duplicate package for linked defect',
        priority: 'HIGH',
        executionMode: 'INTERNAL',
        planningNote: 'This should be rejected because the defect is already scoped.'
      },
      ignoreResponseError: true
    });
    expect(!linkedDefect.ok && linkedDefect.error.code).toBe(
      'MAINTENANCE_PACKAGE_DEFECT_ALREADY_SCOPED'
    );

    const internalWithVendor = await $fetch<ApiResponse<unknown>>(
      '/api/maintenance/work-packages',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
        body: {
          aircraftId: 'ac-pk-mrb',
          primaryDefectId: 'adefect-mrov1-selector',
          title: 'Internal package retaining vendor',
          priority: 'HIGH',
          executionMode: 'INTERNAL',
          vendorId: 'vendor-djj-maintenance',
          planningNote: 'This should be rejected because internal execution cannot retain a vendor.'
        },
        ignoreResponseError: true
      }
    );
    expect(!internalWithVendor.ok && internalWithVendor.error.code).toBe(
      'MAINTENANCE_PACKAGE_VENDOR_NOT_ALLOWED_FOR_INTERNAL'
    );

    const mismatchedFlight = await $fetch<ApiResponse<unknown>>('/api/maintenance/work-packages', {
      method: 'POST',
      headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
      body: {
        aircraftId: 'ac-pk-mrb',
        primaryDefectId: 'adefect-mrov1-selector',
        sourceFlightId: 'fop-closed-djj-wmx',
        title: 'Package with mismatched source flight',
        priority: 'HIGH',
        executionMode: 'INTERNAL',
        planningNote: 'This should be rejected because source flight is not derived from defect.'
      },
      ignoreResponseError: true
    });
    expect(!mismatchedFlight.ok && mismatchedFlight.error.code).toBe(
      'MAINTENANCE_PACKAGE_SOURCE_FLIGHT_MISMATCH'
    );

    const sqlite = new Database(resolveDbPath(testDbPath));
    sqlite
      .prepare(
        `INSERT INTO aircraft_defects (
          id, aircraft_id, defect_number, title, description, detected_at,
          detected_by_user_id, source_reference, evidence_references, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`
      )
      .run(
        'adefect-api-unassessed',
        'ac-pk-mrb',
        'DEF-API-UNASSESSED',
        'Unassessed brake defect',
        'Unassessed defect should not be eligible for contextual work-package creation.',
        '2026-07-31T09:00:00.000Z',
        'USR-001',
        'TECHLOG-API-UNASSESSED',
        JSON.stringify(['TECHLOG-API-UNASSESSED']),
        '2026-07-31T09:00:00.000Z',
        '2026-07-31T09:00:00.000Z'
      );
    sqlite.close();

    const unassessed = await $fetch<ApiResponse<unknown>>('/api/maintenance/work-packages', {
      method: 'POST',
      headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
      body: {
        aircraftId: 'ac-pk-mrb',
        primaryDefectId: 'adefect-api-unassessed',
        title: 'Package for unassessed defect',
        priority: 'HIGH',
        executionMode: 'INTERNAL',
        planningNote: 'This should be rejected until Maintenance Control/PPC assessment exists.'
      },
      ignoreResponseError: true
    });
    expect(!unassessed.ok && unassessed.error.code).toBe(
      'MAINTENANCE_PACKAGE_DEFECT_ASSESSMENT_REQUIRED'
    );
  });

  it('supports atomic contextual package creation from selector output', async () => {
    const selectors = await $fetch<ApiResponse<MaintenanceSelectorDataDto>>(
      '/api/maintenance/selector-data',
      { headers: { cookie: 'ama_demo_role=Maintenance%20Manager' } }
    );
    expect(selectors.ok).toBe(true);
    if (!selectors.ok) throw new Error(selectors.error.message);
    const defect = selectors.data.eligibleDefects.find(
      (item) => item.defectNumber === 'DEF-MROV1-MRB-001'
    );
    expect(defect).toBeDefined();

    const created = await $fetch<ApiResponse<MaintenanceWorkPackageDto>>(
      '/api/maintenance/work-packages',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
        body: {
          aircraftId: defect!.aircraftId,
          primaryDefectId: defect!.id,
          sourceFlightId: defect!.derivedSourceFlightId,
          title: 'Brake wear indication rectification',
          priority: 'HIGH',
          executionMode: 'INTERNAL',
          vendorId: null,
          planningNote: 'Planning evidence: technical-log and assessment reviewed.',
          initialJobCard: {
            title: 'Inspect and rectify brake wear indication',
            taskType: 'DEFECT_RECTIFICATION',
            maintenanceDataRef: 'AMM C208B 32-40-00',
            maintenanceDataRevision: 'REV-MROV1-2026-08',
            mandatoryFlag: true,
            requiresIndependentInspection: true
          }
        }
      }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error.message);
    expect(created.data).toMatchObject({
      aircraftRegistrationNumber: 'PK-MRB',
      primaryDefectNumber: 'DEF-MROV1-MRB-001',
      executionMode: 'INTERNAL',
      vendorId: null,
      status: 'IN_PROGRESS',
      version: 2
    });
    expect(created.data.jobCards[0]).toMatchObject({
      title: 'Inspect and rectify brake wear indication',
      requiresIndependentInspection: true
    });
  });

  it('issues a release with signer snapshot and replays the same idempotency key without duplication', async () => {
    const body = {
      expectedVersion: 4,
      releaseNumber: 'RTS-MROV1-API-001',
      resultingStatus: 'SERVICEABLE',
      releaseStatement:
        'Technical release issued after controlled review of mandatory job card, evidence, and independent inspection.',
      certifyingLicenseNumber: 'AME-CERT-MRO-001',
      releasedAt: '2026-07-31T08:00:00.000Z',
      evidenceReferences: ['MROV1-API-RELEASE-EVIDENCE'],
      idempotencyKey: 'mrov1-api-release-key-001'
    };

    const released = await $fetch<ApiResponse<MaintenanceWorkPackageDto>>(
      '/api/maintenance/work-packages/mwp-mrov1-release-ready/actions/release',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=Certifying%20Staff' },
        body,
        ignoreResponseError: true
      }
    );
    if (!released.ok) throw new Error(JSON.stringify(released.error));
    expect(released.ok).toBe(true);
    expect(released.data.status).toBe('RELEASED');
    expect(released.data.aircraftTechnicalState).toBe('SERVICEABLE');
    expect(released.data.release?.signerAuthorizationSnapshot).toMatchObject({
      actorUserId: 'USR-CERTIFYING-STAFF',
      licenseNumber: 'AME-CERT-MRO-001',
      companyAuthorizationValidated: true,
      companyAuthorizationNumber: 'PTAMA-MRO-AUTH-REL-001'
    });

    const replay = await $fetch<ApiResponse<MaintenanceWorkPackageDto>>(
      '/api/maintenance/work-packages/mwp-mrov1-release-ready/actions/release',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=Certifying%20Staff' },
        body,
        ignoreResponseError: true
      }
    );
    if (!replay.ok) throw new Error(JSON.stringify(replay.error));
    expect(replay.data.release?.releaseNumber).toBe('RTS-MROV1-API-001');

    const sqlite = new Database(resolveDbPath(testDbPath));
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM aircraft_maintenance_releases
           WHERE release_number = 'RTS-MROV1-API-001'`
        )
        .get()
    ).toEqual({ count: 1 });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM maintenance_release_eligibility_snapshots
           WHERE release_id = ?`
        )
        .get(released.data.releaseId)
    ).toEqual({ count: 1 });
    sqlite.close();

    const technicalRecord = await $fetch<ApiResponse<MaintenanceTechnicalRecordPackageDto>>(
      '/api/maintenance/work-packages/mwp-mrov1-release-ready/technical-record',
      {
        headers: { cookie: 'ama_demo_role=Certifying%20Staff' },
        ignoreResponseError: true
      }
    );
    if (!technicalRecord.ok) throw new Error(JSON.stringify(technicalRecord.error));
    expect(technicalRecord.data).toMatchObject({
      releaseId: released.data.releaseId,
      releaseSnapshot: expect.objectContaining({
        releaseId: released.data.releaseId,
        eligible: true
      }),
      evidence: expect.objectContaining({
        jobCards: expect.any(Array),
        materialTraceability: expect.any(Array),
        personnelEvidence: expect.any(Array),
        toolEvidence: expect.any(Array),
        approvedDataReferences: expect.any(Array)
      })
    });
    expect(technicalRecord.data.evidence.jobCards.length).toBeGreaterThan(0);
    expect(technicalRecord.data.evidence.materialTraceability.length).toBeGreaterThan(0);
  });

  it('serves technical records through API permissions and domain errors', async () => {
    const authorized = await $fetch<ApiResponse<MaintenanceTechnicalRecordPackageDto>>(
      '/api/maintenance/work-packages/mwp-mrov1-release-ready/technical-record',
      {
        headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
        ignoreResponseError: true
      }
    );
    expect(authorized.ok).toBe(true);
    if (!authorized.ok) throw new Error(authorized.error.message);
    expect(authorized.data.evidence.jobCards.length).toBeGreaterThan(0);
    expect(authorized.data.releaseEligibility).toMatchObject({
      workPackageId: 'mwp-mrov1-release-ready'
    });

    const denied = await $fetch<ApiResponse<unknown>>(
      '/api/maintenance/work-packages/mwp-mrov1-release-ready/technical-record',
      {
        headers: { cookie: 'ama_demo_role=Employee' },
        ignoreResponseError: true
      }
    );
    expect(!denied.ok && denied.error.code).toBe('FORBIDDEN');

    const missing = await $fetch<ApiResponse<unknown>>(
      '/api/maintenance/work-packages/mwp-does-not-exist/technical-record',
      {
        headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
        ignoreResponseError: true
      }
    );
    expect(!missing.ok && missing.error.code).toBe('MAINTENANCE_PACKAGE_NOT_FOUND');
  });

  it('rejects blocked technical-release API paths before mutating release evidence', async () => {
    const active = await $fetch<ApiResponse<MaintenanceWorkPackageDto>>(
      '/api/maintenance/work-packages/mwp-mrov1-active',
      {
        headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
        ignoreResponseError: true
      }
    );
    if (!active.ok) throw new Error(JSON.stringify(active.error));

    const denied = await $fetch<ApiResponse<unknown>>(
      '/api/maintenance/work-packages/mwp-mrov1-active/actions/request-release',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=Maintenance%20Manager' },
        body: { expectedVersion: active.data.version },
        ignoreResponseError: true
      }
    );
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error('Blocked release unexpectedly succeeded.');
    expect(denied.error.code).not.toBe('STALE_VERSION');

    const sqlite = new Database(resolveDbPath(testDbPath));
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM aircraft_maintenance_releases
           WHERE work_order_reference = 'MWP-MROV1-ACTIVE'`
        )
        .get()
    ).toEqual({ count: 0 });
    sqlite.close();
  });

  it('keeps Finance read-only for technical release mutation APIs', async () => {
    const denied = await $fetch<ApiResponse<unknown>>(
      '/api/maintenance/work-packages/mwp-mrov1-release-ready/actions/release',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=Finance%20Reviewer' },
        body: {
          expectedVersion: 4,
          releaseNumber: 'RTS-MROV1-FINANCE-DENIED',
          resultingStatus: 'SERVICEABLE',
          releaseStatement: 'Finance must not issue technical release records from this module.',
          certifyingLicenseNumber: 'AME-CERT-MRO-001',
          releasedAt: '2026-07-31T08:10:00.000Z',
          evidenceReferences: ['MROV1-FINANCE-DENIED'],
          idempotencyKey: 'mrov1-finance-denied'
        },
        ignoreResponseError: true
      }
    );

    expect(!denied.ok && denied.error.code).toBe('FORBIDDEN');
  });
});
