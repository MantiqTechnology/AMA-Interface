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
import { seedInventoryData } from '../../server/db/seeds/inventory';
import { seedMroFoundationData } from '../../server/db/seeds/mro-foundation';
import { seedMroV21Foundation } from '../../server/db/seeds/mro-v21-foundation';
import { seedTicketingData } from '../../server/db/seeds/ticketing';
import { createServices as makeServices } from '../../server/services';
import { createSeededTestServices } from '../helpers/demo-db';

const context = createDemoSeedContext();
const manager = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager',
  requestId: 'test-m6-manager'
};

const certifier = {
  userId: 'USR-CERTIFYING-STAFF',
  role: 'Certifying Staff',
  requestId: 'test-m6-certifier'
};

const facility = {
  facilityId: 'mfac-djj-sentani',
  areaId: 'marea-djj-hangar-01',
  bayA: 'mbay-djj-hgr01-a',
  bayB: 'mbay-djj-hgr01-b'
};

type Services = ReturnType<typeof makeServices>;
type RaceWorkerResult = {
  ok: boolean;
  assignmentId?: string;
  allocationId?: string;
  status?: string;
  code?: string;
  statusCode?: number | null;
  message?: string;
};

async function createFixture() {
  const fixture = await createSeededTestServices();
  seedMroFoundationData(fixture.sqlite, context);
  seedMroV21Foundation(fixture.sqlite, context);
  return fixture;
}

async function createFileFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'ama-m6-race-'));
  const dbPath = join(dir, 'race.sqlite');
  const client = createDbClient(dbPath);
  dropDemoDatabase(client.sqlite);
  runMigrations(client.sqlite);
  await seedDemoData(client.db);
  seedFlightOperationsData(client.sqlite);
  seedTicketingData(client.sqlite);
  seedInventoryData(client.sqlite);
  seedMroFoundationData(client.sqlite, context);
  seedMroV21Foundation(client.sqlite, context);
  return {
    dir,
    dbPath,
    client,
    services: makeServices(client.sqlite)
  };
}

function createWorkPackage(services: Services, aircraftId: string, title: string) {
  return services.maintenance.createWorkPackage(
    {
      aircraftId,
      title,
      priority: 'NORMAL',
      executionMode: 'INTERNAL',
      planningNote: 'M6 resource planning test package'
    },
    manager
  );
}

function slotInput(
  bayId = facility.bayA,
  start = '2026-08-10T08:00:00+09:00',
  end = '2026-08-10T16:00:00+09:00'
) {
  return {
    facilityId: facility.facilityId,
    areaId: facility.areaId,
    bayId,
    plannedStartAt: start,
    plannedEndAt: end
  };
}

function createPersonnelRequirement(services: Services, workPackageId: string, requiredCount = 1) {
  return services.resourceV21.createPersonnelRequirement(
    {
      workPackageId,
      roleType: 'MECHANIC',
      requiredCount,
      requiredLicenceType: 'AMEL',
      requiredAuthorization: 'MECHANIC_SIGN_OFF',
      dutyStationId: 'st-djj',
      requiredFrom: '2026-08-10T08:00:00.000Z',
      requiredUntil: '2026-08-10T16:00:00.000Z'
    },
    manager
  );
}

function createToolRequirement(services: Services, workPackageId: string) {
  return services.resourceV21.createToolRequirement(
    {
      workPackageId,
      toolType: 'MROV2_TEST_EQUIPMENT',
      quantity: 1,
      requiredStationId: 'st-djj',
      requiredFrom: '2026-08-10T08:00:00.000Z',
      requiredUntil: '2026-08-10T16:00:00.000Z'
    },
    manager
  );
}

function bookSlot(
  services: Services,
  workPackageId: string,
  bayId = facility.bayA,
  start = '2026-08-10T08:00:00+09:00',
  end = '2026-08-10T16:00:00+09:00'
) {
  return services.maintenance.bookMaintenanceSlot(
    workPackageId,
    {
      ...slotInput(bayId, start, end),
      idempotencyKey: `m6-slot-${workPackageId}-${bayId}-${start}`
    },
    manager
  );
}

function encodeRaceInput(input: Record<string, string>) {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
}

function runRaceWorker(
  workerName: string,
  input: Record<string, string>
): Promise<RaceWorkerResult> {
  const workerPath = join(process.cwd(), 'tests/helpers', workerName);
  const child = spawn(process.execPath, ['--import', 'tsx', workerPath, encodeRaceInput(input)], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
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
      try {
        resolve(JSON.parse(line) as RaceWorkerResult);
      } catch (error) {
        reject(
          new Error(
            `Race worker JSON parse failed: ${String(error)} stdout=${stdout} stderr=${stderr}`
          )
        );
      }
    });
  });
}

describe('Resource-v21 M6 personnel and tool control', () => {
  it('requires eligible confirmed personnel for readiness and preserves sign-off guard independence', async () => {
    const { services, sqlite } = await createFixture();
    const workPackage = createWorkPackage(services, 'ac-pk-mra', 'M6 personnel readiness');
    bookSlot(services, workPackage.id);
    services.resourceV21.declareResource(
      workPackage.id,
      { resourceType: 'PERSONNEL', declaration: 'REQUIRED' },
      manager
    );
    const requirement = createPersonnelRequirement(services, workPackage.id);

    const candidates = services.resourceV21.listPersonnelCandidates(requirement.id, workPackage.id);
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          personnelId: 'crew-maintenance-manager',
          eligibilityStatus: 'ELIGIBLE',
          availabilityStatus: 'AVAILABLE'
        })
      ])
    );

    sqlite
      .prepare(
        'UPDATE maintenance_company_authorizations SET valid_until = ? WHERE personnel_id = ?'
      )
      .run(context.date(-1), 'crew-maintenance-technician');
    expect(
      services.resourceV21
        .listPersonnelCandidates(requirement.id, workPackage.id)
        .find((candidate) => candidate.personnelId === 'crew-maintenance-technician')?.reasons
    ).toContain('AUTHORIZATION_EXPIRED');
    sqlite
      .prepare(
        'UPDATE maintenance_personnel_requirements SET required_licence_type = ? WHERE id = ?'
      )
      .run('B2', requirement.id);
    expect(
      services.resourceV21
        .listPersonnelCandidates(requirement.id, workPackage.id)
        .find((candidate) => candidate.personnelId === 'crew-maintenance-manager')?.reasons
    ).toContain('LICENCE_TYPE_MISMATCH');
    sqlite
      .prepare(
        'UPDATE maintenance_personnel_requirements SET required_licence_type = ? WHERE id = ?'
      )
      .run('AMEL', requirement.id);
    expect(() =>
      services.resourceV21.assignPersonnel(
        {
          personnelRequirementId: requirement.id,
          personnelId: 'crew-maintenance-technician',
          idempotencyKey: 'm6-expired-auth-assignment'
        },
        manager,
        workPackage.id
      )
    ).toThrow(/AUTHORIZATION_EXPIRED|PERSONNEL_NOT_ELIGIBLE/u);

    const assigned = services.resourceV21.assignPersonnel(
      {
        personnelRequirementId: requirement.id,
        personnelId: 'crew-maintenance-manager',
        idempotencyKey: 'm6-personnel-assignment'
      },
      manager,
      workPackage.id
    );
    expect(assigned.status).toBe('ASSIGNED');
    expect(services.resourceV21.getResourceReadiness(workPackage.id).personnel.ready).toBe(false);

    const confirmed = services.resourceV21.confirmAssignment(assigned.id, manager, workPackage.id);
    expect(confirmed.status).toBe('CONFIRMED');
    expect(services.resourceV21.getResourceReadiness(workPackage.id).personnel.ready).toBe(true);

    sqlite
      .prepare(
        'UPDATE maintenance_company_authorizations SET valid_until = ? WHERE personnel_id = ?'
      )
      .run(context.date(-1), 'crew-maintenance-manager');
    expect(services.resourceV21.getResourceReadiness(workPackage.id).personnel.ready).toBe(false);
    sqlite
      .prepare(
        'UPDATE maintenance_company_authorizations SET valid_until = ? WHERE personnel_id = ?'
      )
      .run(context.date(365), 'crew-maintenance-manager');

    services.resourceV21.releaseAssignment(assigned.id, manager, workPackage.id);
    expect(services.resourceV21.getResourceReadiness(workPackage.id).personnel.ready).toBe(false);

    const refreshedPackage = services.maintenance.getWorkPackage(workPackage.id);
    const card = services.maintenance
      .addJobCard(
        workPackage.id,
        {
          title: 'M6 authorization independence job',
          taskType: 'INSPECTION',
          maintenanceDataRef: 'AMM-M6-AUTH',
          maintenanceDataRevision: 'Rev A',
          mandatoryFlag: true,
          requiresIndependentInspection: false,
          expectedWorkPackageVersion: refreshedPackage.version
        },
        manager
      )
      .jobCards.at(-1)!;

    expect(() =>
      services.maintenance.signWork(
        card.id,
        {
          expectedVersion: card.version,
          certifyingLicenseNumber: 'AME-CERT-MRO-001',
          statement: 'Assigned person does not make this actor authorized to sign.',
          evidenceReferences: ['m6-auth-negative']
        },
        certifier
      )
    ).toThrow(/authorization|licence|action/i);
  });

  it('enforces personnel slot conflicts, adjacency, idempotency, and no-slot uncertainty', async () => {
    const { services } = await createFixture();
    const wpA = createWorkPackage(services, 'ac-pk-mra', 'M6 personnel WP A');
    const wpB = createWorkPackage(services, 'ac-pk-mrb', 'M6 personnel WP B');
    bookSlot(services, wpA.id);
    bookSlot(
      services,
      wpB.id,
      facility.bayB,
      '2026-08-10T10:00:00+09:00',
      '2026-08-10T14:00:00+09:00'
    );
    const reqA = createPersonnelRequirement(services, wpA.id);
    const reqB = createPersonnelRequirement(services, wpB.id);

    const first = services.resourceV21.assignPersonnel(
      {
        personnelRequirementId: reqA.id,
        personnelId: 'crew-maintenance-manager',
        idempotencyKey: 'm6-personnel-idempotent'
      },
      manager,
      wpA.id
    );
    const replay = services.resourceV21.assignPersonnel(
      {
        personnelRequirementId: reqA.id,
        personnelId: 'crew-maintenance-manager',
        idempotencyKey: 'm6-personnel-idempotent'
      },
      manager,
      wpA.id
    );
    expect(replay.id).toBe(first.id);
    expect(() =>
      services.resourceV21.assignPersonnel(
        {
          personnelRequirementId: reqB.id,
          personnelId: 'crew-maintenance-manager',
          idempotencyKey: 'm6-personnel-conflict'
        },
        manager,
        wpB.id
      )
    ).toThrow(/PERSONNEL_SCHEDULE_CONFLICT/u);

    const wpAdjacent = createWorkPackage(services, 'ac-pk-mrb', 'M6 personnel adjacent');
    bookSlot(
      services,
      wpAdjacent.id,
      facility.bayB,
      '2026-08-10T16:00:00+09:00',
      '2026-08-10T20:00:00+09:00'
    );
    const reqAdjacent = createPersonnelRequirement(services, wpAdjacent.id);
    expect(
      services.resourceV21.assignPersonnel(
        {
          personnelRequirementId: reqAdjacent.id,
          personnelId: 'crew-maintenance-manager',
          idempotencyKey: 'm6-personnel-adjacent'
        },
        manager,
        wpAdjacent.id
      ).status
    ).toBe('ASSIGNED');

    const wpNoSlot = createWorkPackage(services, 'ac-pk-mrb', 'M6 personnel no slot');
    const reqNoSlot = createPersonnelRequirement(services, wpNoSlot.id);
    const noSlotCandidate = services.resourceV21
      .listPersonnelCandidates(reqNoSlot.id, wpNoSlot.id)
      .find((candidate) => candidate.personnelId === 'crew-maintenance-manager');
    expect(noSlotCandidate?.availabilityStatus).toBe('NOT_SCHEDULE_VALIDATED');
  });

  it('enforces tool eligibility, allocation, custody, return, and readiness', async () => {
    const { services, sqlite } = await createFixture();
    const workPackage = createWorkPackage(services, 'ac-pk-mra', 'M6 tool readiness');
    bookSlot(services, workPackage.id);
    services.resourceV21.declareResource(
      workPackage.id,
      { resourceType: 'TOOL', declaration: 'REQUIRED' },
      manager
    );
    const requirement = createToolRequirement(services, workPackage.id);

    const candidates = services.resourceV21.listToolCandidates(requirement.id, workPackage.id);
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          toolId: 'mtool-mrov2-calibrated',
          eligibilityStatus: 'ELIGIBLE'
        }),
        expect.objectContaining({
          toolId: 'mtool-mrov2-expired',
          eligibilityStatus: 'INELIGIBLE'
        })
      ])
    );
    expect(
      candidates.find((candidate) => candidate.toolId === 'mtool-mrov2-expired')?.reasons
    ).toContain('TOOL_CALIBRATION_EXPIRED');

    const allocation = services.resourceV21.allocateTool(
      {
        toolRequirementId: requirement.id,
        toolId: 'mtool-mrov2-calibrated',
        idempotencyKey: 'm6-tool-allocation'
      },
      manager,
      workPackage.id
    );
    const replay = services.resourceV21.allocateTool(
      {
        toolRequirementId: requirement.id,
        toolId: 'mtool-mrov2-calibrated',
        idempotencyKey: 'm6-tool-allocation'
      },
      manager,
      workPackage.id
    );
    expect(replay.id).toBe(allocation.id);
    expect(services.resourceV21.getResourceReadiness(workPackage.id).tools.ready).toBe(true);

    sqlite
      .prepare(
        'UPDATE maintenance_tool_masters SET calibration_expires_at = ?, status = ? WHERE id = ?'
      )
      .run(context.date(-1), 'CALIBRATION_EXPIRED', 'mtool-mrov2-calibrated');
    expect(services.resourceV21.getResourceReadiness(workPackage.id).tools.ready).toBe(false);
    sqlite
      .prepare(
        'UPDATE maintenance_tool_masters SET calibration_expires_at = ?, status = ? WHERE id = ?'
      )
      .run(context.date(90), 'AVAILABLE', 'mtool-mrov2-calibrated');

    expect(() =>
      services.resourceV21.returnTool(
        {
          allocationId: allocation.id,
          returnCondition: 'SERVICEABLE',
          returnNote: 'Return before custody should fail.',
          idempotencyKey: 'm6-tool-return-before-custody'
        },
        manager,
        workPackage.id
      )
    ).toThrow(/checked out before it can be returned/u);

    const inCustody = services.resourceV21.assignToolCustody(
      { allocationId: allocation.id, custodianPersonnelId: 'crew-maintenance-manager' },
      manager,
      workPackage.id
    );
    expect(inCustody.status).toBe('IN_USE');

    const returned = services.resourceV21.returnTool(
      {
        allocationId: allocation.id,
        returnCondition: 'UNSERVICEABLE',
        returnNote: 'Torque wrench failed post-use check.',
        idempotencyKey: 'm6-tool-return'
      },
      manager,
      workPackage.id
    );
    expect(returned.status).toBe('RETURNED');
    expect(
      services.resourceV21.returnTool(
        {
          allocationId: allocation.id,
          returnCondition: 'UNSERVICEABLE',
          returnNote: 'Double return replay.',
          idempotencyKey: 'm6-tool-return-replay'
        },
        manager,
        workPackage.id
      ).status
    ).toBe('RETURNED');
    expect(
      (
        sqlite
          .prepare('SELECT status FROM maintenance_tool_masters WHERE id = ?')
          .get('mtool-mrov2-calibrated') as { status: string }
      ).status
    ).toBe('OUT_OF_SERVICE');
  });

  it('enforces serialized tool slot conflicts while allowing adjacent allocation', async () => {
    const { services } = await createFixture();
    const wpA = createWorkPackage(services, 'ac-pk-mra', 'M6 tool WP A');
    const wpB = createWorkPackage(services, 'ac-pk-mrb', 'M6 tool WP B');
    bookSlot(services, wpA.id);
    bookSlot(
      services,
      wpB.id,
      facility.bayB,
      '2026-08-10T10:00:00+09:00',
      '2026-08-10T14:00:00+09:00'
    );
    const reqA = createToolRequirement(services, wpA.id);
    const reqB = createToolRequirement(services, wpB.id);

    services.resourceV21.allocateTool(
      {
        toolRequirementId: reqA.id,
        toolId: 'mtool-mrov2-calibrated',
        idempotencyKey: 'm6-tool-conflict-first'
      },
      manager,
      wpA.id
    );
    expect(() =>
      services.resourceV21.allocateTool(
        {
          toolRequirementId: reqB.id,
          toolId: 'mtool-mrov2-calibrated',
          idempotencyKey: 'm6-tool-conflict-second'
        },
        manager,
        wpB.id
      )
    ).toThrow(/TOOL_SCHEDULE_CONFLICT/u);

    const wpAdjacent = createWorkPackage(services, 'ac-pk-mrb', 'M6 tool adjacent');
    bookSlot(
      services,
      wpAdjacent.id,
      facility.bayB,
      '2026-08-10T16:00:00+09:00',
      '2026-08-10T20:00:00+09:00'
    );
    const reqAdjacent = createToolRequirement(services, wpAdjacent.id);
    const adjacentAllocation = services.resourceV21.allocateTool(
      {
        toolRequirementId: reqAdjacent.id,
        toolId: 'mtool-mrov2-calibrated',
        idempotencyKey: 'm6-tool-adjacent'
      },
      manager,
      wpAdjacent.id
    );
    expect(adjacentAllocation.status).toBe('ALLOCATED');
    const firstAllocation = services.resourceV21
      .listToolAllocations(wpA.id)
      .find((allocation) => allocation.toolId === 'mtool-mrov2-calibrated');
    expect(firstAllocation).toBeTruthy();
    services.resourceV21.assignToolCustody(
      { allocationId: firstAllocation!.id, custodianPersonnelId: 'crew-maintenance-manager' },
      manager,
      wpA.id
    );
    expect(() =>
      services.resourceV21.assignToolCustody(
        { allocationId: adjacentAllocation.id, custodianPersonnelId: 'crew-maintenance-manager' },
        manager,
        wpAdjacent.id
      )
    ).toThrow(/already in custody/u);
  });

  it('prevents personnel and tool overlap with true concurrent DB writers', async () => {
    const fixture = await createFileFixture();
    try {
      const wpA = createWorkPackage(fixture.services, 'ac-pk-mra', 'M6 race WP A');
      const wpB = createWorkPackage(fixture.services, 'ac-pk-mrb', 'M6 race WP B');
      bookSlot(fixture.services, wpA.id);
      bookSlot(
        fixture.services,
        wpB.id,
        facility.bayB,
        '2026-08-10T10:00:00+09:00',
        '2026-08-10T14:00:00+09:00'
      );
      const personnelReqA = createPersonnelRequirement(fixture.services, wpA.id);
      const personnelReqB = createPersonnelRequirement(fixture.services, wpB.id);
      const toolReqA = createToolRequirement(fixture.services, wpA.id);
      const toolReqB = createToolRequirement(fixture.services, wpB.id);

      const personnelGate = join(fixture.dir, 'personnel-gate');
      const personnelAWorker = runRaceWorker('resource-v21-personnel-assignment-worker.ts', {
        dbPath: fixture.dbPath,
        gatePath: personnelGate,
        workPackageId: wpA.id,
        personnelRequirementId: personnelReqA.id,
        personnelId: 'crew-maintenance-manager',
        idempotencyKey: 'm6-personnel-race-a'
      });
      const personnelBWorker = runRaceWorker('resource-v21-personnel-assignment-worker.ts', {
        dbPath: fixture.dbPath,
        gatePath: personnelGate,
        workPackageId: wpB.id,
        personnelRequirementId: personnelReqB.id,
        personnelId: 'crew-maintenance-manager',
        idempotencyKey: 'm6-personnel-race-b'
      });
      writeFileSync(personnelGate, 'go');
      const [personnelA, personnelB] = await Promise.all([personnelAWorker, personnelBWorker]);
      expect([personnelA.ok, personnelB.ok].filter(Boolean)).toHaveLength(1);
      expect([personnelA, personnelB].filter((result) => !result.ok)[0]?.code).toMatch(
        /PERSONNEL_SCHEDULE_CONFLICT/
      );

      const toolGate = join(fixture.dir, 'tool-gate');
      const toolAWorker = runRaceWorker('resource-v21-tool-allocation-worker.ts', {
        dbPath: fixture.dbPath,
        gatePath: toolGate,
        workPackageId: wpA.id,
        toolRequirementId: toolReqA.id,
        toolId: 'mtool-mrov2-calibrated',
        idempotencyKey: 'm6-tool-race-a'
      });
      const toolBWorker = runRaceWorker('resource-v21-tool-allocation-worker.ts', {
        dbPath: fixture.dbPath,
        gatePath: toolGate,
        workPackageId: wpB.id,
        toolRequirementId: toolReqB.id,
        toolId: 'mtool-mrov2-calibrated',
        idempotencyKey: 'm6-tool-race-b'
      });
      writeFileSync(toolGate, 'go');
      const [toolA, toolB] = await Promise.all([toolAWorker, toolBWorker]);
      expect([toolA.ok, toolB.ok].filter(Boolean)).toHaveLength(1);
      expect([toolA, toolB].filter((result) => !result.ok)[0]?.code).toMatch(
        /TOOL_SCHEDULE_CONFLICT/
      );

      const personnelActive = fixture.client.sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM maintenance_personnel_assignments
           WHERE personnel_id = 'crew-maintenance-manager'
             AND work_package_id IN (?, ?)
             AND status IN ('ASSIGNED', 'CONFIRMED')`
        )
        .get(wpA.id, wpB.id) as { count: number };
      const toolActive = fixture.client.sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM maintenance_tool_allocations_v2
           WHERE tool_id = 'mtool-mrov2-calibrated'
             AND work_package_id IN (?, ?)
             AND status IN ('ALLOCATED', 'IN_USE')`
        )
        .get(wpA.id, wpB.id) as { count: number };
      expect(personnelActive.count).toBe(1);
      expect(toolActive.count).toBe(1);
    } finally {
      fixture.client.sqlite.close();
      rmSync(fixture.dir, { recursive: true, force: true });
    }
  });
});
