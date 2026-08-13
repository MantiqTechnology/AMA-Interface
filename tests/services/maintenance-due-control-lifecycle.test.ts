import { describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { seedMroFoundationData } from '../../server/db/seeds/mro-foundation';
import type {
  MaintenanceDueStatusDto,
  MaintenanceWorkPackageDto
} from '../../shared/features/maintenance';
import { createSeededTestServices } from '../helpers/demo-db';

const context = createDemoSeedContext();
const manager = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager',
  requestId: 'test-m5-manager'
};
const technician = {
  userId: 'USR-MAINTENANCE-TECHNICIAN',
  role: 'Maintenance Technician',
  requestId: 'test-m5-technician'
};
const certifier = {
  userId: 'USR-CERTIFYING-STAFF',
  role: 'Certifying Staff',
  requestId: 'test-m5-certifier'
};
const unauthorized = {
  userId: 'USR-001',
  role: 'OCC',
  requestId: 'test-m5-unauthorized'
};

async function createFixture() {
  const fixture = await createSeededTestServices();
  seedMroFoundationData(fixture.sqlite, context);
  fixture.sqlite
    .prepare(
      "DELETE FROM maintenance_aircraft_requirement_statuses WHERE requirement_id = 'mdue-m5-ama-100fh'"
    )
    .run();
  fixture.sqlite
    .prepare("DELETE FROM maintenance_due_requirements WHERE id = 'mdue-m5-ama-100fh'")
    .run();
  fixture.sqlite
    .prepare(
      `INSERT OR IGNORE INTO maintenance_demo_amo_capability_scopes (
        id, scope_code, aircraft_type, aircraft_registration, permitted_actions_json,
        status, valid_from, valid_until, notes, created_at, updated_at
      ) VALUES (
        'mamo-m5-pc6', 'AMA-M5-AMO-PC6', 'Pilatus PC-6', NULL, '["TECHNICAL_RELEASE"]',
        'ACTIVE', ?, ?, 'M5 test AMO scope. Fictional demo data only.', ?, ?
      )`
    )
    .run(context.date(-30), context.date(180), context.now, context.now);
  return fixture;
}

function setAircraftUtilization(sqlite: Database.Database, hours: number, cycles: number) {
  sqlite
    .prepare(
      `UPDATE aircraft
       SET airframe_hours = ?, airframe_cycles = ?, updated_at = ?
       WHERE id = 'ac-pk-ama'`
    )
    .run(hours, cycles, context.now);
}

function seedDueRequirement(
  sqlite: Database.Database,
  options: {
    id: string;
    code: string;
    title: string;
    nextDueAt?: string | null;
    nextDueFlightHours?: number | null;
    nextDueFlightCycles?: number | null;
    intervalCalendarDays?: number | null;
    intervalFlightHours?: number | null;
    intervalFlightCycles?: number | null;
    status?: MaintenanceDueStatusDto['status'];
    active?: boolean;
  }
) {
  sqlite
    .prepare(
      `INSERT INTO maintenance_due_requirements (
        id, code, title, aircraft_id, applicability, source_approved_data_revision_id,
        interval_calendar_days, interval_flight_hours, interval_flight_cycles,
        tolerance_calendar_days, tolerance_flight_hours, tolerance_flight_cycles,
        mandatory, recurring, active, fictional_demo, created_at, updated_at
      ) VALUES (?, ?, ?, 'ac-pk-ama', 'M5 deterministic test applicability', NULL,
        ?, ?, ?, 0, 0, 0, 1, 1, ?, 1, ?, ?)`
    )
    .run(
      options.id,
      options.code,
      options.title,
      options.intervalCalendarDays ?? null,
      options.intervalFlightHours ?? null,
      options.intervalFlightCycles ?? null,
      options.active === false ? 0 : 1,
      context.now,
      context.now
    );
  sqlite
    .prepare(
      `INSERT INTO maintenance_aircraft_requirement_statuses (
        id, requirement_id, aircraft_id, last_completed_at, last_completed_flight_hours,
        last_completed_flight_cycles, next_due_at, next_due_flight_hours,
        next_due_flight_cycles, status, calculated_at, source_work_package_id,
        source_job_card_id, planned_work_package_id, last_compliance_record_id
      ) VALUES (?, ?, 'ac-pk-ama', ?, 1200, 2000, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`
    )
    .run(
      `${options.id}-status`,
      options.id,
      context.at(-100, '09:00'),
      options.nextDueAt ?? null,
      options.nextDueFlightHours ?? null,
      options.nextDueFlightCycles ?? null,
      options.status ?? 'NOT_DUE',
      context.now
    );
}

function dueItem(
  services: Awaited<ReturnType<typeof createSeededTestServices>>['services'],
  code: string
) {
  const item = services.maintenance.listDueControl().find((candidate) => candidate.code === code);
  if (!item) throw new Error(`Due item not found: ${code}`);
  return item;
}

function prepareReleaseReadyWorkPackage(
  services: Awaited<ReturnType<typeof createSeededTestServices>>['services'],
  workPackage: MaintenanceWorkPackageDto
) {
  let current = services.maintenance.addJobCard(
    workPackage.id,
    {
      title: 'M5 scheduled maintenance work card',
      taskType: 'SCHEDULED_TASK',
      maintenanceDataRef: 'AMM DEMO M5 05-10-00',
      maintenanceDataRevision: 'REV-M5-2026-08',
      mandatoryFlag: true,
      requiresIndependentInspection: false,
      expectedWorkPackageVersion: workPackage.version
    },
    manager
  );
  let card = current.jobCards.find((item) => item.title === 'M5 scheduled maintenance work card')!;
  current = services.maintenance.startJobCard(
    card.id,
    { expectedVersion: card.version },
    technician
  );
  card = current.jobCards.find((item) => item.id === card.id)!;
  current = services.maintenance.signWork(
    card.id,
    {
      expectedVersion: card.version,
      certifyingLicenseNumber: 'AME-TECH-MRO-001',
      statement: 'Scheduled M5 maintenance task completed with required evidence.',
      evidenceReferences: ['M5-SCHEDULED-WORK-EVIDENCE']
    },
    technician
  );
  current = services.maintenance.requestRelease(
    current.id,
    { expectedVersion: current.version },
    manager
  );
  return current;
}

describe('Maintenance M5 due control lifecycle', () => {
  it('computes FH, FC, and calendar due states from canonical utilization', async () => {
    const { services, sqlite } = await createFixture();
    setAircraftUtilization(sqlite, 1260, 2170);
    seedDueRequirement(sqlite, {
      id: 'mdue-m5-fh',
      code: 'M5-FH-100',
      title: 'M5 100 FH inspection',
      nextDueFlightHours: 1300,
      intervalFlightHours: 100
    });
    seedDueRequirement(sqlite, {
      id: 'mdue-m5-fc',
      code: 'M5-FC-200',
      title: 'M5 200 FC inspection',
      nextDueFlightCycles: 2200,
      intervalFlightCycles: 200
    });
    seedDueRequirement(sqlite, {
      id: 'mdue-m5-calendar',
      code: 'M5-CAL-180',
      title: 'M5 calendar inspection',
      nextDueAt: context.at(5, '09:00'),
      intervalCalendarDays: 180
    });

    expect(dueItem(services, 'M5-FH-100')).toMatchObject({
      status: 'NOT_DUE',
      flightHoursRemaining: 40,
      forecastHorizonDays: null
    });
    expect(dueItem(services, 'M5-FC-200')).toMatchObject({
      status: 'NOT_DUE',
      flightCyclesRemaining: 30,
      forecastHorizonDays: null
    });
    expect(dueItem(services, 'M5-CAL-180')).toMatchObject({
      status: 'DUE_SOON',
      calendarRemainingDays: 5,
      forecastHorizonDays: 30
    });

    setAircraftUtilization(sqlite, 1300, 2200);
    expect(dueItem(services, 'M5-FH-100').status).toBe('DUE');
    expect(dueItem(services, 'M5-FC-200').status).toBe('DUE');

    setAircraftUtilization(sqlite, 1301, 2201);
    expect(dueItem(services, 'M5-FH-100').status).toBe('OVERDUE');
    expect(dueItem(services, 'M5-FC-200').status).toBe('OVERDUE');

    sqlite
      .prepare(
        `UPDATE maintenance_aircraft_requirement_statuses
         SET next_due_at = ?, calculated_at = ?
         WHERE id = 'mdue-m5-calendar-status'`
      )
      .run(context.at(0, '09:00'), context.now);
    expect(dueItem(services, 'M5-CAL-180').status).toBe('DUE');
    sqlite
      .prepare(
        `UPDATE maintenance_aircraft_requirement_statuses
         SET next_due_at = ?, calculated_at = ?
         WHERE id = 'mdue-m5-calendar-status'`
      )
      .run(context.at(-1, '09:00'), context.now);
    expect(dueItem(services, 'M5-CAL-180').status).toBe('OVERDUE');

    sqlite.close();
  });

  it('plans a Work Package from a due item without compliance or synthetic Job Card', async () => {
    const { services, sqlite } = await createFixture();
    setAircraftUtilization(sqlite, 1301, 2201);
    seedDueRequirement(sqlite, {
      id: 'mdue-m5-plan',
      code: 'M5-PLAN-100FH',
      title: 'M5 overdue planning requirement',
      nextDueFlightHours: 1300,
      intervalFlightHours: 100,
      status: 'OVERDUE'
    });
    const overdue = dueItem(services, 'M5-PLAN-100FH');

    expect(() =>
      services.maintenance.createWorkPackageFromDueStatus(overdue.id, {}, unauthorized)
    ).toThrow(/permission|restricted/i);

    const workPackage = services.maintenance.createWorkPackageFromDueStatus(
      overdue.id,
      { planningNote: 'Plan M5 overdue requirement.' },
      manager
    );
    expect(workPackage).toMatchObject({
      aircraftId: 'ac-pk-ama',
      sourceDueRequirementId: 'mdue-m5-plan',
      sourceDueStatusId: overdue.id
    });
    expect(workPackage.jobCards).toHaveLength(0);
    const planned = dueItem(services, 'M5-PLAN-100FH');
    expect(planned.status).toBe('OVERDUE');
    expect(planned.planningStatus).toBe('PLANNED');
    expect(planned.plannedWorkPackageId).toBe(workPackage.id);

    const replay = services.maintenance.createWorkPackageFromDueStatus(overdue.id, {}, manager);
    expect(replay.id).toBe(workPackage.id);
    const count = (
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM maintenance_work_packages
           WHERE source_due_status_id = ? AND status <> 'CANCELLED'`
        )
        .get(overdue.id) as { count: number }
    ).count;
    expect(count).toBe(1);
    sqlite.close();
  });

  it('records canonical compliance at technical release and does not double-advance recurrence', async () => {
    const { services, sqlite } = await createFixture();
    setAircraftUtilization(sqlite, 1301, 2201);
    seedDueRequirement(sqlite, {
      id: 'mdue-m5-release',
      code: 'M5-RELEASE-100FH',
      title: 'M5 release compliance requirement',
      nextDueFlightHours: 1300,
      intervalFlightHours: 100,
      status: 'OVERDUE'
    });
    const overdue = dueItem(services, 'M5-RELEASE-100FH');
    let workPackage = services.maintenance.createWorkPackageFromDueStatus(overdue.id, {}, manager);
    workPackage = prepareReleaseReadyWorkPackage(services, workPackage);
    const releaseInput = {
      expectedVersion: workPackage.version,
      releaseNumber: 'RTS-M5-100FH-001',
      resultingStatus: 'SERVICEABLE' as const,
      releaseStatement:
        'Technical release for M5 due control compliance after scheduled maintenance completion.',
      certifyingLicenseNumber: 'AME-CERT-MRO-001',
      releasedAt: context.at(0, '08:30'),
      evidenceReferences: ['M5-RTS-EVIDENCE-001'],
      idempotencyKey: 'm5-release-100fh-idempotent'
    };

    const released = services.maintenance.releaseWorkPackage(
      workPackage.id,
      releaseInput,
      certifier
    );
    expect(released.status).toBe('RELEASED');
    const afterRelease = dueItem(services, 'M5-RELEASE-100FH');
    expect(afterRelease.status).toBe('NOT_DUE');
    expect(afterRelease.lastCompletedFlightHours).toBe(1301);
    expect(afterRelease.nextDueFlightHours).toBe(1401);
    expect(afterRelease.planningStatus).toBe('COMPLIED');
    expect(afterRelease.complianceRecordId).toBeTruthy();

    const replay = services.maintenance.releaseWorkPackage(workPackage.id, releaseInput, certifier);
    expect(replay.id).toBe(released.id);
    const rows = sqlite
      .prepare(
        `SELECT *
         FROM maintenance_due_compliance_records
         WHERE requirement_id = 'mdue-m5-release'`
      )
      .all() as Array<{ next_due_flight_hours: number }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.next_due_flight_hours).toBe(1401);
    expect(dueItem(services, 'M5-RELEASE-100FH').nextDueFlightHours).toBe(1401);

    sqlite.close();
  });
});
