import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

const admin = {
  userId: 'USR-ADMIN',
  role: 'Demo Admin',
  stationCodes: ['ALL']
};

describe('station operations flight workspace', () => {
  it('returns one persistent flight aggregate with tasks, evidence, costs, services and audit', async () => {
    const { services, sqlite } = await createSeededTestServices();
    services.flightOperations.evaluate('fop-checkin-open', admin.userId);

    const result = await services.flightOperations.getStationOperations(
      { flightId: 'fop-checkin-open' },
      admin
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      flightId: 'fop-checkin-open',
      originStationCode: 'DJJ',
      destinationStationCode: 'WMX'
    });
    expect(result[0].tasks.length).toBeGreaterThan(0);
    expect(Array.isArray(result[0].services)).toBe(true);
    expect(Array.isArray(result[0].costs)).toBe(true);
    expect(Array.isArray(result[0].evidence)).toBe(true);
    expect(Array.isArray(result[0].audit)).toBe(true);
    expect(result[0]).toHaveProperty('reconciliation');

    sqlite.close();
  });

  it('enforces station scope before returning the workspace', async () => {
    const { services, sqlite } = await createSeededTestServices();

    await expect(
      services.flightOperations.getStationOperations(
        { flightId: 'fop-checkin-open', stationCode: 'DJJ' },
        { ...admin, role: 'Station Admin', stationCodes: ['TIM'] }
      )
    ).rejects.toThrow(/cannot access Station Operations/);

    sqlite.close();
  });

  it('does not expose opposite-station audit entries in a scoped workspace', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO flight_operational_audit (
           id, actor_user_id, actor_role, flight_id, station_id, module, action,
           reason, timestamp, created_at
         ) VALUES
           ('audit-origin-visible', 'USR-STATION-ADMIN', 'Station Admin',
            'fop-checkin-open', 'st-djj', 'STATION_TASK', 'VISIBLE', 'origin only', ?, ?),
           ('audit-destination-hidden', 'USR-STATION-ADMIN', 'Station Admin',
            'fop-checkin-open', 'st-wmx', 'STATION_TASK', 'HIDDEN', 'destination only', ?, ?)`
      )
      .run(now, now, now, now);

    const [result] = await services.flightOperations.getStationOperations(
      { flightId: 'fop-checkin-open', stationCode: 'DJJ' },
      { ...admin, role: 'Station Admin', stationCodes: ['DJJ'] }
    );
    expect(result.audit.map((entry: { action: string }) => entry.action)).toContain('VISIBLE');
    expect(result.audit.map((entry: { action: string }) => entry.action)).not.toContain('HIDDEN');

    sqlite.close();
  });

  it('reserves actual reconciliation for destination station scope', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flight = services.flightOperations.detail('fop-landed-maintenance');

    await expect(
      services.flightOperations.reconcileFlightActuals(
        {
          flightId: flight.id,
          plannedPassengers: 0,
          actualPassengers: 0,
          plannedCargoKg: 0,
          actualCargoKg: 0,
          expectedVersion: 0
        },
        {
          ...admin,
          role: 'Station Admin',
          stationCodes: [flight.originStationCode]
        }
      )
    ).rejects.toThrow(/cannot perform this action/);

    sqlite.close();
  });

  it('keeps verified origin handling and its evidence after unrelated service changes and refreshes', async () => {
    const { services, sqlite } = await createSeededTestServices();
    services.flightOperations.evaluate('fop-checkin-open', admin.userId);

    const handlingType = sqlite
      .prepare("SELECT id FROM station_service_types WHERE code = 'HANDLING'")
      .get() as { id: string };
    const parkingType = sqlite
      .prepare("SELECT id FROM station_service_types WHERE code = 'PARKING'")
      .get() as { id: string };
    const supplier = sqlite
      .prepare('SELECT id FROM station_service_suppliers ORDER BY id LIMIT 1')
      .get() as { id: string };

    const handling = services.flightOperations.createStationService(
      {
        flightId: 'fop-checkin-open',
        stationId: 'st-djj',
        serviceSupplierId: supplier.id,
        serviceTypeId: handlingType.id,
        referenceRate: 1_000_000
      },
      admin.userId
    );
    services.flightOperations.confirmStationService(handling.id, admin.userId, handling.version);

    const [initial] = await services.flightOperations.getStationOperations(
      { flightId: 'fop-checkin-open' },
      admin
    );
    const handlingTask = initial.tasks.find(
      (task: { taskCode: string }) => task.taskCode === 'ORIGIN_HANDLING'
    );
    expect(handlingTask).toBeDefined();

    await services.flightOperations.addStationTaskEvidence(
      {
        stationTaskId: handlingTask.id,
        expectedVersion: handlingTask.version,
        fileName: 'origin-handling-confirmation.pdf',
        documentType: 'STATION_OPERATION_EVIDENCE'
      },
      admin
    );
    await services.flightOperations.verifyStationTask(
      {
        taskId: handlingTask.id,
        expectedVersion: handlingTask.version,
        reason: 'Origin handling source and evidence checked.'
      },
      admin
    );
    sqlite
      .prepare(
        `UPDATE flight_readiness_checks
         SET status_id = 'readiness-status-pass', calculation_status = 'PASS',
             verification_status = 'VERIFIED', effective_status = 'PASSED'
         WHERE flight_id = 'fop-checkin-open'
           AND check_code IN ('HANDLING_CONFIRMED', 'MANIFEST_APPROVED')`
      )
      .run();

    const parking = services.flightOperations.createStationService(
      {
        flightId: 'fop-checkin-open',
        stationId: 'st-wmx',
        serviceSupplierId: supplier.id,
        serviceTypeId: parkingType.id,
        referenceRate: 250_000
      },
      admin.userId
    );
    services.flightOperations.confirmStationService(parking.id, admin.userId, parking.version);

    for (let refresh = 0; refresh < 2; refresh += 1) {
      const [workspace] = await services.flightOperations.getStationOperations(
        { flightId: 'fop-checkin-open' },
        admin
      );
      expect(
        workspace.tasks.find((task: { taskCode: string }) => task.taskCode === 'ORIGIN_HANDLING')
      ).toMatchObject({
        status: 'VERIFIED',
        evidenceCount: 1
      });
      expect(workspace.evidence).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            stationTaskId: handlingTask.id,
            fileName: 'origin-handling-confirmation.pdf'
          })
        ])
      );
    }
    expect(
      sqlite
        .prepare(
          `SELECT check_code, status_id, calculation_status, effective_status
           FROM flight_readiness_checks
           WHERE flight_id = 'fop-checkin-open'
             AND check_code IN ('HANDLING_CONFIRMED', 'MANIFEST_APPROVED')
           ORDER BY check_code`
        )
        .all()
    ).toEqual([
      {
        check_code: 'HANDLING_CONFIRMED',
        status_id: 'readiness-status-pass',
        calculation_status: 'PASS',
        effective_status: 'PASSED'
      },
      {
        check_code: 'MANIFEST_APPROVED',
        status_id: 'readiness-status-pass',
        calculation_status: 'PASS',
        effective_status: 'PASSED'
      }
    ]);

    services.flightOperations.createStationService(
      {
        flightId: 'fop-checkin-open',
        stationId: 'st-djj',
        serviceSupplierId: supplier.id,
        serviceTypeId: handlingType.id,
        referenceRate: 1_250_000
      },
      admin.userId
    );
    const [invalidatedWorkspace] = await services.flightOperations.getStationOperations(
      { flightId: 'fop-checkin-open' },
      admin
    );
    expect(
      invalidatedWorkspace.tasks.find(
        (task: { taskCode: string }) => task.taskCode === 'ORIGIN_HANDLING'
      )
    ).toMatchObject({
      status: 'PENDING',
      evidenceCount: 1
    });
    expect(
      sqlite
        .prepare(
          `SELECT status_id, calculation_status, verification_status, effective_status
           FROM flight_readiness_checks
           WHERE flight_id = 'fop-checkin-open' AND check_code = 'HANDLING_CONFIRMED'`
        )
        .get()
    ).toEqual({
      status_id: 'readiness-status-pending',
      calculation_status: 'UNKNOWN',
      verification_status: 'PENDING',
      effective_status: 'BLOCKED'
    });
    expect(
      sqlite
        .prepare(
          `SELECT status_id, calculation_status, effective_status
           FROM flight_readiness_checks
           WHERE flight_id = 'fop-checkin-open' AND check_code = 'MANIFEST_APPROVED'`
        )
        .get()
    ).toEqual({
      status_id: 'readiness-status-pass',
      calculation_status: 'PASS',
      effective_status: 'PASSED'
    });

    sqlite.close();
  });
});
