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
import { seedTicketingData } from '../../server/db/seeds/ticketing';
import { createServices } from '../../server/services';
import { createSeededTestServices } from '../helpers/demo-db';

const context = createDemoSeedContext();
const manager = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager',
  requestId: 'test-m55-manager'
};
const unauthorized = {
  userId: 'USR-001',
  role: 'OCC',
  requestId: 'test-m55-unauthorized'
};
const facility = {
  facilityId: 'mfac-djj-sentani',
  areaId: 'marea-djj-hangar-01',
  bayA: 'mbay-djj-hgr01-a',
  bayB: 'mbay-djj-hgr01-b'
};

async function createFixture() {
  const fixture = await createSeededTestServices();
  seedMroFoundationData(fixture.sqlite, context);
  return fixture;
}

async function createFileFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'ama-m55-race-'));
  const dbPath = join(dir, 'race.sqlite');
  const client = createDbClient(dbPath);
  dropDemoDatabase(client.sqlite);
  runMigrations(client.sqlite);
  await seedDemoData(client.db);
  seedFlightOperationsData(client.sqlite);
  seedTicketingData(client.sqlite);
  seedInventoryData(client.sqlite);
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
  aircraftId: string,
  title: string
) {
  return services.maintenance.createWorkPackage(
    {
      aircraftId,
      title,
      priority: 'NORMAL',
      executionMode: 'INTERNAL',
      planningNote: 'M5.5 facility planning test package'
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

function expectDomainCode(error: unknown, pattern: RegExp) {
  const detail = error as { code?: string; message?: string };
  expect(`${detail.code ?? ''} ${detail.message ?? ''}`).toMatch(pattern);
}

type RaceWorkerInput = {
  dbPath: string;
  gatePath: string;
  workPackageId: string;
  facilityId: string;
  areaId: string;
  bayId: string;
  plannedStartAt: string;
  plannedEndAt: string;
  idempotencyKey: string;
};

type RaceWorkerResult = {
  ok: boolean;
  slotId?: string;
  status?: string;
  code?: string;
  statusCode?: number | null;
  message?: string;
};

function encodeRaceInput(input: RaceWorkerInput) {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
}

function runRaceWorker(input: RaceWorkerInput): Promise<RaceWorkerResult> {
  const workerPath = join(process.cwd(), 'tests/helpers/maintenance-slot-booking-worker.ts');
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

describe('M5.5 maintenance facility planning', () => {
  it('creates a booked maintenance slot from a Work Package with UTC timestamp storage', async () => {
    const { services } = await createFixture();
    const workPackage = createWorkPackage(services, 'ac-pk-mra', 'M5.5 100 FH slot booking');

    const preview = services.maintenance.previewMaintenanceSlotAvailability(
      workPackage.id,
      slotInput(),
      manager
    );
    expect(preview.available).toBe(true);
    expect(preview.aircraftId).toBe('ac-pk-mra');
    expect(preview.stationId).toBe('st-djj');
    expect(preview.plannedStartAt).toBe('2026-08-09T23:00:00.000Z');

    const slot = services.maintenance.bookMaintenanceSlot(
      workPackage.id,
      { ...slotInput(), idempotencyKey: 'm55-create-slot-main' },
      manager
    );
    expect(slot.status).toBe('BOOKED');
    expect(services.maintenance.getWorkPackage(workPackage.id).currentMaintenanceSlot?.id).toBe(
      slot.id
    );
  });

  it('enforces bay overlap, adjacent boundary, same-aircraft conflict, inactive bay, and station mismatch', async () => {
    const { services, sqlite } = await createFixture();
    const primary = createWorkPackage(services, 'ac-pk-mra', 'M5.5 primary bay booking');
    services.maintenance.bookMaintenanceSlot(
      primary.id,
      { ...slotInput(), idempotencyKey: 'm55-primary-booking' },
      manager
    );

    const before = createWorkPackage(services, 'ac-pk-mrb', 'M5.5 adjacent before');
    expect(
      services.maintenance.bookMaintenanceSlot(
        before.id,
        {
          ...slotInput(facility.bayA, '2026-08-10T07:00:00+09:00', '2026-08-10T08:00:00+09:00'),
          idempotencyKey: 'm55-adjacent-before'
        },
        manager
      ).status
    ).toBe('BOOKED');

    const after = createWorkPackage(services, 'ac-pk-mrb', 'M5.5 adjacent after');
    expect(
      services.maintenance.bookMaintenanceSlot(
        after.id,
        {
          ...slotInput(facility.bayA, '2026-08-10T16:00:00+09:00', '2026-08-10T18:00:00+09:00'),
          idempotencyKey: 'm55-adjacent-after'
        },
        manager
      ).status
    ).toBe('BOOKED');

    for (const [title, start, end] of [
      ['M5.5 inside overlap', '2026-08-10T09:00:00+09:00', '2026-08-10T10:00:00+09:00'],
      ['M5.5 cover overlap', '2026-08-10T07:00:00+09:00', '2026-08-10T17:00:00+09:00'],
      ['M5.5 edge overlap', '2026-08-10T07:00:00+09:00', '2026-08-10T09:00:00+09:00']
    ] as const) {
      const wp = createWorkPackage(services, 'ac-pk-mrb', title);
      expect(() =>
        services.maintenance.bookMaintenanceSlot(
          wp.id,
          { ...slotInput(facility.bayA, start, end), idempotencyKey: `key-${title}` },
          manager
        )
      ).toThrow();
    }

    const sameAircraft = createWorkPackage(services, 'ac-pk-mra', 'M5.5 same aircraft conflict');
    try {
      services.maintenance.bookMaintenanceSlot(
        sameAircraft.id,
        {
          ...slotInput(facility.bayB, '2026-08-10T10:00:00+09:00', '2026-08-10T12:00:00+09:00'),
          idempotencyKey: 'm55-aircraft-conflict'
        },
        manager
      );
      throw new Error('Expected aircraft slot conflict');
    } catch (error) {
      expectDomainCode(error, /AIRCRAFT_SLOT_CONFLICT/);
    }

    sqlite
      .prepare('UPDATE maintenance_facility_bays SET active = 0 WHERE id = ?')
      .run(facility.bayB);
    const inactive = createWorkPackage(services, 'ac-pk-mrb', 'M5.5 inactive bay');
    try {
      services.maintenance.bookMaintenanceSlot(
        inactive.id,
        {
          ...slotInput(facility.bayB, '2026-08-11T08:00:00+09:00', '2026-08-11T12:00:00+09:00'),
          idempotencyKey: 'm55-inactive-bay'
        },
        manager
      );
      throw new Error('Expected inactive bay rejection');
    } catch (error) {
      expectDomainCode(error, /BAY_INACTIVE/);
    }
    sqlite
      .prepare('UPDATE maintenance_facility_bays SET active = 1 WHERE id = ?')
      .run(facility.bayB);

    sqlite
      .prepare("UPDATE aircraft SET current_station_id = 'st-wmx' WHERE id = 'ac-pk-mrb'")
      .run();
    const mismatch = createWorkPackage(services, 'ac-pk-mrb', 'M5.5 station mismatch');
    try {
      services.maintenance.bookMaintenanceSlot(
        mismatch.id,
        {
          ...slotInput(facility.bayB, '2026-08-11T08:00:00+09:00', '2026-08-11T12:00:00+09:00'),
          idempotencyKey: 'm55-station-mismatch'
        },
        manager
      );
      throw new Error('Expected station mismatch');
    } catch (error) {
      expectDomainCode(error, /FACILITY_STATION_MISMATCH/);
    }
  });

  it('handles idempotency, reschedule, cancellation, history, and status guards', async () => {
    const { services, sqlite } = await createFixture();
    const workPackage = createWorkPackage(services, 'ac-pk-mra', 'M5.5 reschedule package');
    const first = services.maintenance.bookMaintenanceSlot(
      workPackage.id,
      { ...slotInput(), idempotencyKey: 'm55-idempotent-booking' },
      manager
    );
    const replay = services.maintenance.bookMaintenanceSlot(
      workPackage.id,
      { ...slotInput(), idempotencyKey: 'm55-idempotent-booking' },
      manager
    );
    expect(replay.id).toBe(first.id);

    const rescheduled = services.maintenance.rescheduleMaintenanceSlot(
      first.id,
      {
        ...slotInput(facility.bayB, '2026-08-10T09:00:00+09:00', '2026-08-10T17:00:00+09:00'),
        reason: 'Planner moved the package to Bay B.'
      },
      manager
    );
    expect(rescheduled.bayId).toBe(facility.bayB);

    const freedBay = createWorkPackage(services, 'ac-pk-mrb', 'M5.5 old bay reusable');
    expect(
      services.maintenance.bookMaintenanceSlot(
        freedBay.id,
        {
          ...slotInput(facility.bayA, '2026-08-10T09:00:00+09:00', '2026-08-10T17:00:00+09:00'),
          idempotencyKey: 'm55-old-bay-free'
        },
        manager
      ).bayId
    ).toBe(facility.bayA);

    services.maintenance.cancelMaintenanceSlot(
      first.id,
      { reason: 'Planner no longer needs this maintenance slot.' },
      manager
    );
    const replacement = createWorkPackage(services, 'ac-pk-mrc', 'M5.5 cancelled bay reusable');
    expect(
      services.maintenance.bookMaintenanceSlot(
        replacement.id,
        {
          ...slotInput(facility.bayB, '2026-08-10T09:00:00+09:00', '2026-08-10T17:00:00+09:00'),
          idempotencyKey: 'm55-cancelled-bay-free'
        },
        manager
      ).bayId
    ).toBe(facility.bayB);

    const completedPackage = createWorkPackage(
      services,
      'ac-pk-mra',
      'M5.5 completed history slot'
    );
    const completed = services.maintenance.bookMaintenanceSlot(
      completedPackage.id,
      {
        ...slotInput(facility.bayA, '2026-08-11T08:00:00+09:00', '2026-08-11T16:00:00+09:00'),
        idempotencyKey: 'm55-completed-history'
      },
      manager
    );
    sqlite
      .prepare("UPDATE maintenance_slots SET status = 'COMPLETED' WHERE id = ?")
      .run(completed.id);
    const completedReplacement = createWorkPackage(
      services,
      'ac-pk-mrb',
      'M5.5 completed bay reusable'
    );
    expect(
      services.maintenance.bookMaintenanceSlot(
        completedReplacement.id,
        {
          ...slotInput(facility.bayA, '2026-08-11T08:00:00+09:00', '2026-08-11T16:00:00+09:00'),
          idempotencyKey: 'm55-completed-bay-free'
        },
        manager
      ).bayId
    ).toBe(facility.bayA);

    const activeOccupancy = services.maintenance.listMaintenanceOccupancy(
      {
        stationId: 'st-djj',
        facilityId: facility.facilityId,
        dateFrom: '2026-08-10T23:00:00.000Z',
        dateTo: '2026-08-11T07:00:00.000Z'
      },
      manager
    );
    expect(activeOccupancy.slots.map((item) => item.id)).not.toContain(completed.id);
    const historicalOccupancy = services.maintenance.listMaintenanceOccupancy(
      {
        stationId: 'st-djj',
        facilityId: facility.facilityId,
        dateFrom: '2026-08-10T23:00:00.000Z',
        dateTo: '2026-08-11T07:00:00.000Z',
        status: 'COMPLETED'
      },
      manager
    );
    expect(historicalOccupancy.slots.map((item) => item.id)).toContain(completed.id);

    const eventCount = sqlite
      .prepare('SELECT COUNT(*) AS count FROM maintenance_slot_events WHERE slot_id = ?')
      .get(first.id) as { count: number };
    const auditCount = sqlite
      .prepare(
        "SELECT COUNT(*) AS count FROM maintenance_audit_logs WHERE entity_id = ? AND entity_type = 'MAINTENANCE_SLOT'"
      )
      .get(first.id) as { count: number };
    expect(eventCount.count).toBe(3);
    expect(auditCount.count).toBe(3);

    const guarded = services.maintenance.bookMaintenanceSlot(
      createWorkPackage(services, 'ac-pk-mrb', 'M5.5 guarded slot').id,
      {
        ...slotInput(facility.bayA, '2026-08-12T08:00:00+09:00', '2026-08-12T16:00:00+09:00'),
        idempotencyKey: 'm55-guarded'
      },
      manager
    );
    sqlite
      .prepare("UPDATE maintenance_slots SET status = 'IN_PROGRESS' WHERE id = ?")
      .run(guarded.id);
    try {
      services.maintenance.rescheduleMaintenanceSlot(
        guarded.id,
        {
          ...slotInput(facility.bayB, '2026-08-12T09:00:00+09:00', '2026-08-12T17:00:00+09:00'),
          reason: 'Attempt invalid reschedule.'
        },
        manager
      );
      throw new Error('Expected immutable slot rejection');
    } catch (error) {
      expectDomainCode(error, /FACILITY_SLOT_IMMUTABLE/);
    }
  });

  it('rejects unauthorized planners and keeps occupancy driven by slots', async () => {
    const { services } = await createFixture();
    const workPackage = createWorkPackage(services, 'ac-pk-mra', 'M5.5 unauthorized package');
    try {
      services.maintenance.bookMaintenanceSlot(
        workPackage.id,
        { ...slotInput(), idempotencyKey: 'm55-unauthorized' },
        unauthorized
      );
      throw new Error('Expected unauthorized booking rejection');
    } catch (error) {
      expectDomainCode(error, /MAINTENANCE_PERMISSION_REQUIRED/);
    }

    const slot = services.maintenance.bookMaintenanceSlot(
      workPackage.id,
      { ...slotInput(), idempotencyKey: 'm55-occupancy' },
      manager
    );
    const occupancy = services.maintenance.listMaintenanceOccupancy(
      {
        stationId: 'st-djj',
        facilityId: facility.facilityId,
        dateFrom: '2026-08-09T00:00:00.000Z',
        dateTo: '2026-08-12T00:00:00.000Z'
      },
      manager
    );
    expect(occupancy.slots.map((item) => item.id)).toContain(slot.id);
  });

  it('prevents overlapping bay booking with true concurrent DB writers', async () => {
    const fixture = await createFileFixture();
    try {
      const wpA = createWorkPackage(fixture.services, 'ac-pk-mra', 'M5.5 race WP A');
      const wpB = createWorkPackage(fixture.services, 'ac-pk-mrb', 'M5.5 race WP B');
      const gatePath = join(fixture.dir, 'gate');
      const common = {
        dbPath: fixture.dbPath,
        gatePath,
        facilityId: facility.facilityId,
        areaId: facility.areaId,
        bayId: facility.bayA,
        plannedStartAt: '2026-08-13T08:00:00+09:00',
        plannedEndAt: '2026-08-13T16:00:00+09:00'
      };
      const attempts = [
        runRaceWorker({ ...common, workPackageId: wpA.id, idempotencyKey: 'm55-race-a' }),
        runRaceWorker({ ...common, workPackageId: wpB.id, idempotencyKey: 'm55-race-b' })
      ];
      writeFileSync(gatePath, 'go');
      const results = await Promise.all(attempts);
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(
        results.filter((result) => !result.ok && result.code === 'FACILITY_SLOT_CONFLICT')
      ).toHaveLength(1);
      const count = fixture.client.sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM maintenance_slots
           WHERE bay_id = ?
             AND status IN ('BOOKED', 'IN_PROGRESS')
             AND planned_start_at < ?
             AND planned_end_at > ?`
        )
        .get(facility.bayA, '2026-08-13T07:00:00.000Z', '2026-08-12T23:00:00.000Z') as {
        count: number;
      };
      expect(count.count).toBe(1);
    } finally {
      fixture.client.sqlite.close();
      rmSync(fixture.dir, { recursive: true, force: true });
    }
  });
});
