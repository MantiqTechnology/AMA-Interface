import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDbClient } from '../../server/db/client';
import { dropDemoDatabase, runMigrations } from '../../server/db/migrate';
import { seedDemoData } from '../../server/db/seed';
import { seedFlightOperationsData } from '../../server/db/seed-flight-operations';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { seedCorporateAssets } from '../../server/db/seeds/corporate-assets';
import { seedInventoryData } from '../../server/db/seeds/inventory';
import { seedMroFoundationData } from '../../server/db/seeds/mro-foundation';
import { seedTicketingData } from '../../server/db/seeds/ticketing';
import { createServices } from '../../server/services';
import { createSeededTestServices } from '../helpers/demo-db';

const context = createDemoSeedContext();
const manager = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager',
  requestId: 'test-m85-manager'
};
const occActor = 'USR-001';
const facility = {
  facilityId: 'mfac-djj-sentani',
  areaId: 'marea-djj-hangar-01',
  bayA: 'mbay-djj-hgr01-a',
  bayB: 'mbay-djj-hgr01-b'
};

async function createFixture() {
  const fixture = await createSeededTestServices();
  seedFlightOperationsData(fixture.sqlite);
  seedCorporateAssets(fixture.sqlite);
  seedMroFoundationData(fixture.sqlite, context);
  return fixture;
}

async function createFileFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'ama-m85-race-'));
  const dbPath = join(dir, 'race.sqlite');
  const client = createDbClient(dbPath);
  dropDemoDatabase(client.sqlite);
  runMigrations(client.sqlite);
  await seedDemoData(client.db);
  seedFlightOperationsData(client.sqlite);
  seedTicketingData(client.sqlite);
  seedInventoryData(client.sqlite);
  seedCorporateAssets(client.sqlite);
  seedMroFoundationData(client.sqlite, context);
  return {
    dir,
    dbPath,
    client,
    services: createServices(client.sqlite)
  };
}

function createWorkPackage(
  services: Awaited<ReturnType<typeof createSeededTestServices>>['services'],
  aircraftId = 'ac-pk-mra',
  title = 'M8.5 facility operations package'
) {
  return services.maintenance.createWorkPackage(
    {
      aircraftId,
      title,
      priority: 'NORMAL',
      executionMode: 'INTERNAL',
      planningNote: 'M8.5 facility operations test package'
    },
    manager
  );
}

function bookSlot(
  services: Awaited<ReturnType<typeof createSeededTestServices>>['services'],
  workPackageId: string,
  bayId = facility.bayA,
  start = '2026-08-10T08:00:00+09:00',
  end = '2026-08-10T16:00:00+09:00'
) {
  return services.maintenance.bookMaintenanceSlot(
    workPackageId,
    {
      facilityId: facility.facilityId,
      areaId: facility.areaId,
      bayId,
      plannedStartAt: start,
      plannedEndAt: end,
      idempotencyKey: `m85-slot-${workPackageId}-${bayId}-${start}`
    },
    manager
  );
}

type RaceWorkerResult = {
  ok: boolean;
  code?: string;
  status?: string;
  allocationId?: string;
  custodyId?: string;
  message?: string;
};

function encodeRaceInput(input: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
}

function runRaceWorker(
  workerName: string,
  input: Record<string, unknown>
): Promise<RaceWorkerResult> {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', join(process.cwd(), 'tests/helpers', workerName), encodeRaceInput(input)],
    {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', () => {
      const line = stdout.trim().split('\n').filter(Boolean).at(-1);
      if (!line) {
        reject(new Error(`Race worker produced no JSON output. stderr=${stderr}`));
        return;
      }
      resolve(JSON.parse(line) as RaceWorkerResult);
    });
  });
}

function markWorkPackageReleasedForCustodyTest(
  sqlite: Awaited<ReturnType<typeof createSeededTestServices>>['sqlite'],
  workPackageId: string,
  aircraftId = 'ac-pk-mra',
  releaseId = `rel-m85-${workPackageId}`
) {
  const releasedAt = context.at(0, '12:00');
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO aircraft_maintenance_releases (
        id, aircraft_id, release_number, resulting_status, work_order_reference,
        release_statement, certifying_user_id, certifying_license_number, released_at,
        evidence_references, defect_ids, signer_authorization_snapshot_json, created_at
      ) VALUES (?, ?, ?, 'SERVICEABLE', ?, ?, 'USR-CERTIFYING-STAFF', 'AME-CERT-MRO-001',
        ?, '["M8.5-CUSTODY-TEST"]', '[]', NULL, ?)`
    )
    .run(
      releaseId,
      aircraftId,
      `REL-M85-${workPackageId.slice(-8)}`,
      workPackageId,
      'Fixture technical release for M8.5 custody movement guard.',
      releasedAt,
      releasedAt
    );
  sqlite
    .prepare(
      `UPDATE maintenance_work_packages
       SET release_id = ?, status = 'RELEASED', released_at = ?
       WHERE id = ?`
    )
    .run(releaseId, releasedAt, workPackageId);
}

describe('M8.5 maintenance facility operations', () => {
  it('derives command-center operation cards, handback gates, workflow, and scoped activity', async () => {
    const { services } = await createFixture();
    let workPackage = createWorkPackage(
      services,
      'ac-pk-ama',
      'M8.5 command-center blocked handback package'
    );
    workPackage = services.maintenance.addJobCard(
      workPackage.id,
      {
        title: 'Hydraulic leak check',
        taskType: 'DEFECT_RECTIFICATION',
        maintenanceDataRef: 'AMM 29-00-00',
        maintenanceDataRevision: 'REV-A',
        mandatoryFlag: true,
        requiresIndependentInspection: false,
        expectedWorkPackageVersion: workPackage.version
      },
      manager
    );
    const slot = bookSlot(services, workPackage.id);

    services.maintenance.requestAircraftMoveIn(
      slot.id,
      { idempotencyKey: 'm85-command-center-move-in' },
      manager
    );
    services.maintenance.confirmAircraftInBay(slot.id, {}, manager);
    services.maintenance.createGseRequirement(
      workPackage.id,
      {
        equipmentType: 'Ground Power Unit',
        quantity: 1,
        mandatory: true,
        notes: 'GPU required before facility handback.'
      },
      manager
    );

    const dashboard = services.maintenance.getFacilityOperations(
      {
        dateFrom: '2026-08-10T00:00:00+09:00',
        dateTo: '2026-08-11T00:00:00+09:00'
      },
      manager
    );
    const operation = dashboard.operations.find((item) => item.slotId === slot.id);

    expect(operation).toMatchObject({
      slotId: slot.id,
      workPackageId: workPackage.id,
      packageNumber: workPackage.packageNumber,
      aircraftRegistrationNumber: 'PK-AMA',
      stationCode: 'DJJ',
      bayCode: slot.bayCode,
      custodyStatus: 'IN_BAY',
      readinessStatus: 'BLOCKED'
    });
    expect(operation?.counts.gsePending).toBe(1);
    expect(operation?.handbackReadiness).toMatchObject({
      status: 'BLOCKED',
      canRequestHandback: false,
      blockerCount: expect.any(Number)
    });
    expect(operation?.handbackReadiness.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'GSE', status: 'PENDING', count: 1 }),
        expect.objectContaining({ key: 'JOB_CARDS', status: 'PENDING' }),
        expect.objectContaining({ key: 'MANPOWER', status: expect.any(String) })
      ])
    );
    expect(operation?.handbackReadiness.nextActions.length).toBeGreaterThan(0);
    expect(operation?.workflowSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'MOVE_IN_REQUESTED', status: 'COMPLETE' }),
        expect.objectContaining({ key: 'IN_BAY_CONFIRMED', status: 'COMPLETE' }),
        expect.objectContaining({ key: 'MAINTENANCE_IN_PROGRESS', status: 'CURRENT' }),
        expect.objectContaining({ key: 'HAND_BACK', status: 'DISABLED' })
      ])
    );
    expect(operation?.recentActivity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: expect.stringMatching(/Aircraft Entered Bay/u) })
      ])
    );
  });

  it('falls back to all active operation slots when the live operation window is empty', async () => {
    const { services } = await createFixture();
    const firstWorkPackage = createWorkPackage(
      services,
      'ac-pk-ama',
      'M8.5 command-center fallback package one'
    );
    const secondWorkPackage = createWorkPackage(
      services,
      'ac-pk-ama',
      'M8.5 command-center fallback package two'
    );
    const firstSlot = bookSlot(services, firstWorkPackage.id);
    const secondSlot = bookSlot(
      services,
      secondWorkPackage.id,
      facility.bayA,
      '2026-08-12T08:00:00+09:00',
      '2026-08-12T16:00:00+09:00'
    );

    const dashboard = services.maintenance.getFacilityOperations(
      {
        aircraftId: 'ac-pk-ama',
        dateFrom: '2026-08-27T00:00:00+09:00',
        dateTo: '2026-08-30T00:00:00+09:00'
      },
      manager
    );

    expect(dashboard.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: firstSlot.id,
          workPackageId: firstWorkPackage.id,
          aircraftRegistrationNumber: 'PK-AMA'
        }),
        expect.objectContaining({
          slotId: secondSlot.id,
          workPackageId: secondWorkPackage.id,
          aircraftRegistrationNumber: 'PK-AMA'
        })
      ])
    );
    expect(dashboard.operations).toHaveLength(2);
    expect(dashboard.occupancy.dateFrom).toBe(firstSlot.plannedStartAt);
    expect(dashboard.occupancy.dateTo).toBe(secondSlot.plannedEndAt);
  });

  it('uses managed_assets as GSE master and requires allocation plus staging for readiness', async () => {
    const { services } = await createFixture();
    const workPackage = createWorkPackage(services);
    const slot = bookSlot(services, workPackage.id);

    const requirement = services.maintenance.createGseRequirement(
      workPackage.id,
      {
        equipmentType: 'Ground Power Unit',
        quantity: 1,
        mandatory: true,
        notes: 'GPU required at bay'
      },
      manager
    );

    const candidates = services.maintenance.listGseCandidates(workPackage.id, requirement.id);
    const invalid = candidates.find((item) => item.assetId === 'asset-gse-gpu-01');
    const valid = candidates.find((item) => item.assetId === 'asset-gse-gpu-02');
    expect(invalid?.eligible).toBe(false);
    expect(invalid?.reasons).toContain('GSE_NOT_SERVICEABLE');
    expect(valid?.eligible).toBe(true);

    expect(
      services.maintenance.evaluateMaintenanceSlotReadiness(slot.id).dimensions.gse.status
    ).toBe('BLOCKED');

    const allocation = services.maintenance.allocateGse(
      workPackage.id,
      {
        requirementId: requirement.id,
        assetId: 'asset-gse-gpu-02',
        idempotencyKey: 'm85-gse-allocation'
      },
      manager
    );
    expect(allocation.status).toBe('ALLOCATED');
    const staged = services.maintenance.stageGse(
      slot.id,
      {
        allocationId: allocation.id,
        idempotencyKey: 'm85-gse-stage'
      },
      manager
    );
    expect(staged.status).toBe('STAGED');
    expect(services.maintenance.evaluateMaintenanceSlotReadiness(slot.id).status).toBe('READY');
  });

  it('keeps BOOKED as planning, then records actual movement/custody separately', async () => {
    const { services } = await createFixture();
    const workPackage = createWorkPackage(services);
    const slot = bookSlot(services, workPackage.id);

    expect(
      services.maintenance.evaluateMaintenanceOperationalAvailability('ac-pk-mra').status
    ).toBe('PLANNED_MAINTENANCE');

    const requirement = services.maintenance.createGseRequirement(
      workPackage.id,
      { equipmentType: 'Ground Power Unit', quantity: 1, mandatory: true },
      manager
    );
    const allocation = services.maintenance.allocateGse(
      workPackage.id,
      {
        requirementId: requirement.id,
        assetId: 'asset-gse-gpu-02',
        idempotencyKey: 'm85-gse-move'
      },
      manager
    );
    services.maintenance.stageGse(
      slot.id,
      { allocationId: allocation.id, idempotencyKey: 'm85-gse-move-stage' },
      manager
    );

    const moving = services.maintenance.requestAircraftMoveIn(
      slot.id,
      { idempotencyKey: 'm85-move-in' },
      manager
    );
    expect(moving.status).toBe('MOVING_IN');
    expect(
      services.maintenance.evaluateMaintenanceOperationalAvailability('ac-pk-mra').status
    ).toBe('IN_MAINTENANCE_FACILITY');

    const inBay = services.maintenance.confirmAircraftInBay(slot.id, {}, manager);
    expect(inBay.status).toBe('IN_BAY');
    expect(services.maintenance.getWorkPackage(workPackage.id).currentMaintenanceSlot?.status).toBe(
      'IN_PROGRESS'
    );
  });

  it('blocks Flight while technical release is complete but maintenance handback is still pending', async () => {
    const { services, sqlite } = await createFixture();
    const workPackage = createWorkPackage(services, 'ac-pk-ama');
    const slot = bookSlot(services, workPackage.id);
    const requirement = services.maintenance.createGseRequirement(
      workPackage.id,
      { equipmentType: 'Ground Power Unit', quantity: 1, mandatory: true },
      manager
    );
    const allocation = services.maintenance.allocateGse(
      workPackage.id,
      {
        requirementId: requirement.id,
        assetId: 'asset-gse-gpu-02',
        idempotencyKey: 'm85-gse-flight'
      },
      manager
    );
    services.maintenance.stageGse(
      slot.id,
      { allocationId: allocation.id, idempotencyKey: 'm85-gse-flight-stage' },
      manager
    );
    services.maintenance.requestAircraftMoveIn(
      slot.id,
      { idempotencyKey: 'm85-flight-move' },
      manager
    );
    services.maintenance.confirmAircraftInBay(slot.id, {}, manager);

    markWorkPackageReleasedForCustodyTest(sqlite, workPackage.id, 'ac-pk-ama');

    services.maintenance.markAircraftReadyForMoveOut(slot.id, {}, manager);
    const operational =
      services.maintenance.evaluateMaintenanceOperationalAvailability('ac-pk-ama');
    expect(operational.available).toBe(false);
    expect(operational.status).toBe('HANDBACK_PENDING');

    const readiness = services.flightOperations.evaluate('fop-ready-approval', occActor);
    const mroOperational = readiness.readinessChecks.find(
      (check) => check.checkCode === 'MAINTENANCE_OPERATIONAL_AVAILABILITY'
    );
    expect(mroOperational?.status).toBe('FAIL');

    services.maintenance.moveAircraftOut(slot.id, {}, manager);
    services.maintenance.handbackAircraft(slot.id, { idempotencyKey: 'm85-handback' }, manager);
    expect(
      services.maintenance.evaluateMaintenanceOperationalAvailability('ac-pk-ama').status
    ).toBe('AVAILABLE');
  });

  it('preserves technical authority: handback does not override a later NO-GO', async () => {
    const { services, sqlite } = await createFixture();
    const workPackage = createWorkPackage(services);
    const slot = bookSlot(services, workPackage.id);
    const requirement = services.maintenance.createGseRequirement(
      workPackage.id,
      { equipmentType: 'Ground Power Unit', quantity: 1, mandatory: true },
      manager
    );
    const allocation = services.maintenance.allocateGse(
      workPackage.id,
      {
        requirementId: requirement.id,
        assetId: 'asset-gse-gpu-02',
        idempotencyKey: 'm85-gse-nogo'
      },
      manager
    );
    services.maintenance.stageGse(
      slot.id,
      { allocationId: allocation.id, idempotencyKey: 'm85-gse-nogo-stage' },
      manager
    );
    services.maintenance.requestAircraftMoveIn(
      slot.id,
      { idempotencyKey: 'm85-nogo-move' },
      manager
    );
    services.maintenance.confirmAircraftInBay(slot.id, {}, manager);

    markWorkPackageReleasedForCustodyTest(sqlite, workPackage.id, 'ac-pk-mra', 'rel-m85-nogo');
    services.maintenance.markAircraftReadyForMoveOut(slot.id, {}, manager);
    services.maintenance.moveAircraftOut(slot.id, {}, manager);
    services.maintenance.handbackAircraft(
      slot.id,
      { idempotencyKey: 'm85-handback-nogo' },
      manager
    );
    expect(
      services.maintenance.evaluateMaintenanceOperationalAvailability('ac-pk-mra').available
    ).toBe(true);

    const aircraftBefore = services.aircraftAirworthiness.detail('ac-pk-mra').aircraft;
    const defectReport = services.aircraftAirworthiness.reportDefect(
      'ac-pk-mra',
      {
        title: 'M8.5 NO-GO after handback',
        description: 'Hydraulic leak found after handback.',
        detectedAt: context.at(0, '14:00'),
        sourceReference: 'M85-NOGO-AFTER-HANDBACK',
        evidenceReferences: ['M85-NOGO-AFTER-HANDBACK'],
        expectedVersion: aircraftBefore.version
      },
      { userId: occActor, role: 'OCC' }
    );
    services.maintenance.assessDefect(
      defectReport.defects[0]!.id,
      {
        assessmentDecision: 'GROUND',
        assessmentNote: 'Aircraft is grounded for M8.5 handback technical authority test.'
      },
      manager
    );
    expect(
      services.aircraftAirworthiness.evaluateAircraftTechnicalEligibility('ac-pk-mra').status
    ).toBe('BLOCKED');
  });

  it('prepares and acknowledges shift handover without creating maintenance sign-off', async () => {
    const { services, sqlite } = await createFixture();
    const workPackage = createWorkPackage(services);
    const slot = bookSlot(services, workPackage.id);
    const shiftA = services.maintenance.createFacilityShift(
      {
        facilityId: facility.facilityId,
        shiftDate: '2026-08-10',
        name: 'Shift A',
        startAt: '2026-08-10T07:00:00+09:00',
        endAt: '2026-08-10T15:00:00+09:00'
      },
      manager
    );
    const shiftB = services.maintenance.createFacilityShift(
      {
        facilityId: facility.facilityId,
        shiftDate: '2026-08-10',
        name: 'Shift B',
        startAt: '2026-08-10T15:00:00+09:00',
        endAt: '2026-08-10T23:00:00+09:00'
      },
      manager
    );

    const beforeSignoffs = Number(
      (
        sqlite.prepare(`SELECT COUNT(*) AS count FROM maintenance_job_card_signoffs`).get() as {
          count: number;
        }
      ).count
    );
    const handover = services.maintenance.prepareShiftHandover(
      slot.id,
      {
        outgoingShiftId: shiftA.id,
        incomingShiftId: shiftB.id,
        notes: 'Panels open and tools staged at Bay A.',
        safetyNotes: ['Panels open', 'Electrical power isolated']
      },
      manager
    );
    expect(handover.status).toBe('PREPARED');
    const acknowledged = services.maintenance.acknowledgeShiftHandover(handover.id, {}, manager);
    expect(acknowledged.status).toBe('ACKNOWLEDGED');
    const afterSignoffs = Number(
      (
        sqlite.prepare(`SELECT COUNT(*) AS count FROM maintenance_job_card_signoffs`).get() as {
          count: number;
        }
      ).count
    );
    expect(afterSignoffs).toBe(beforeSignoffs);
  });

  it('rejects move-in into an actually occupied bay', async () => {
    const { services, sqlite } = await createFixture();
    const first = createWorkPackage(services, 'ac-pk-mra', 'M8.5 first bay custody');
    const second = createWorkPackage(services, 'ac-pk-mrc', 'M8.5 second bay custody');
    const firstSlot = bookSlot(services, first.id, facility.bayA);
    const secondSlot = bookSlot(
      services,
      second.id,
      facility.bayB,
      '2026-08-10T08:00:00+09:00',
      '2026-08-10T16:00:00+09:00'
    );
    sqlite
      .prepare(`UPDATE maintenance_slots SET bay_id = ? WHERE id = ?`)
      .run(facility.bayA, secondSlot.id);
    const req = services.maintenance.createGseRequirement(
      first.id,
      { equipmentType: 'Ground Power Unit', quantity: 1, mandatory: true },
      manager
    );
    const alloc = services.maintenance.allocateGse(
      first.id,
      { requirementId: req.id, assetId: 'asset-gse-gpu-02', idempotencyKey: 'm85-gse-occupied' },
      manager
    );
    services.maintenance.stageGse(
      firstSlot.id,
      { allocationId: alloc.id, idempotencyKey: 'm85-gse-occupied-stage' },
      manager
    );
    services.maintenance.requestAircraftMoveIn(
      firstSlot.id,
      { idempotencyKey: 'm85-occupy' },
      manager
    );
    services.maintenance.confirmAircraftInBay(firstSlot.id, {}, manager);

    expect(() =>
      services.maintenance.requestAircraftMoveIn(
        secondSlot.id,
        { idempotencyKey: 'm85-conflict' },
        manager
      )
    ).toThrow(/BAY_ACTUALLY_OCCUPIED|Maintenance bay is physically occupied/);
  });

  it('prevents concurrent exclusive GSE allocation for overlapping slots', async () => {
    const fixture = await createFileFixture();
    try {
      const first = createWorkPackage(fixture.services, 'ac-pk-mra', 'M8.5 GSE race first');
      const second = createWorkPackage(fixture.services, 'ac-pk-mrc', 'M8.5 GSE race second');
      bookSlot(fixture.services, first.id, facility.bayA);
      bookSlot(
        fixture.services,
        second.id,
        facility.bayB,
        '2026-08-10T10:00:00+09:00',
        '2026-08-10T14:00:00+09:00'
      );
      const firstReq = fixture.services.maintenance.createGseRequirement(
        first.id,
        { equipmentType: 'Ground Power Unit', quantity: 1, mandatory: true },
        manager
      );
      const secondReq = fixture.services.maintenance.createGseRequirement(
        second.id,
        { equipmentType: 'Ground Power Unit', quantity: 1, mandatory: true },
        manager
      );
      const gatePath = join(fixture.dir, 'start-gse');
      const [left, right] = await Promise.all([
        runRaceWorker('maintenance-gse-allocation-worker.ts', {
          dbPath: fixture.dbPath,
          gatePath,
          workPackageId: first.id,
          requirementId: firstReq.id,
          assetId: 'asset-gse-gpu-02',
          idempotencyKey: 'm85-gse-race-a'
        }),
        runRaceWorker('maintenance-gse-allocation-worker.ts', {
          dbPath: fixture.dbPath,
          gatePath,
          workPackageId: second.id,
          requirementId: secondReq.id,
          assetId: 'asset-gse-gpu-02',
          idempotencyKey: 'm85-gse-race-b'
        }),
        Promise.resolve().then(() => writeFileSync(gatePath, 'go'))
      ]);
      const results = [left, right];
      expect(results.filter((item) => item.ok)).toHaveLength(1);
      expect(
        results.filter((item) => !item.ok && item.code === 'GSE_SCHEDULE_CONFLICT')
      ).toHaveLength(1);
      const activeCount = Number(
        (
          fixture.client.sqlite
            .prepare(
              `SELECT COUNT(*) AS count
               FROM maintenance_gse_allocations
               WHERE asset_id = 'asset-gse-gpu-02' AND status IN ('ALLOCATED', 'STAGED', 'IN_USE')`
            )
            .get() as { count: number }
        ).count
      );
      expect(activeCount).toBe(1);
    } finally {
      fixture.client.sqlite.close();
      rmSync(fixture.dir, { recursive: true, force: true });
    }
  });

  it('prevents concurrent actual move-in into the same bay', async () => {
    const fixture = await createFileFixture();
    try {
      const first = createWorkPackage(fixture.services, 'ac-pk-mra', 'M8.5 move race first');
      const second = createWorkPackage(fixture.services, 'ac-pk-mrc', 'M8.5 move race second');
      const firstSlot = bookSlot(fixture.services, first.id, facility.bayA);
      const secondSlot = bookSlot(fixture.services, second.id, facility.bayB);
      fixture.client.sqlite
        .prepare(`UPDATE maintenance_slots SET bay_id = ? WHERE id = ?`)
        .run(facility.bayA, secondSlot.id);
      const gatePath = join(fixture.dir, 'start-move');
      const [left, right] = await Promise.all([
        runRaceWorker('maintenance-move-in-worker.ts', {
          dbPath: fixture.dbPath,
          gatePath,
          slotId: firstSlot.id,
          idempotencyKey: 'm85-move-race-a'
        }),
        runRaceWorker('maintenance-move-in-worker.ts', {
          dbPath: fixture.dbPath,
          gatePath,
          slotId: secondSlot.id,
          idempotencyKey: 'm85-move-race-b'
        }),
        Promise.resolve().then(() => writeFileSync(gatePath, 'go'))
      ]);
      const results = [left, right];
      expect(results.filter((item) => item.ok)).toHaveLength(1);
      expect(
        results.filter((item) => !item.ok && item.code === 'BAY_ACTUALLY_OCCUPIED')
      ).toHaveLength(1);
      const activeCount = Number(
        (
          fixture.client.sqlite
            .prepare(
              `SELECT COUNT(*) AS count
               FROM maintenance_aircraft_custodies
               WHERE bay_id = ? AND status IN ('MOVING_IN', 'IN_BAY', 'READY_FOR_MOVE_OUT', 'MOVING_OUT', 'HANDBACK_PENDING')`
            )
            .get(facility.bayA) as { count: number }
        ).count
      );
      expect(activeCount).toBe(1);
    } finally {
      fixture.client.sqlite.close();
      rmSync(fixture.dir, { recursive: true, force: true });
    }
  });
});
