import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

const occActor = 'USR-001';
const adminActor = 'USR-DEMO-ADMIN';

function createReadinessDraft(
  services: Awaited<ReturnType<typeof createSeededTestServices>>['services']
) {
  return services.flightOperations.create(
    {
      flightDate: '2026-07-14',
      flightTypeId: 'flight-type-charter',
      serviceTypeId: 'flight-service-type-charter-cargo',
      priorityId: 'flight-priority-normal',
      routeId: 'route-djj-wmx',
      customerId: 'cust-papua-logistics',
      aircraftId: 'ac-pk-ama',
      pilotInCommandId: 'crew-pic-valid',
      coPilotId: 'crew-cop-valid',
      scheduledDepartureAt: '2026-07-14T01:00:00.000Z',
      scheduledArrivalAt: '2026-07-14T02:05:00.000Z',
      remarks: 'Readiness regression test'
    },
    occActor
  );
}

describe('FlightOperationsService', () => {
  it('lists seeded operational flight scenarios', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const overview = services.flightOperations.list({
      search: '',
      limit: 20,
      offset: 0
    });

    expect(overview.flights.length).toBeGreaterThanOrEqual(5);
    expect(overview.summary.CLOSED).toBeGreaterThanOrEqual(1);
    expect(overview.summary.BLOCKED).toBeGreaterThanOrEqual(1);

    sqlite.close();
  });

  it('keeps workflow lookups local and estimates revenue from rate cards', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const lookups = services.flightOperations.lookups();
    expect(lookups.flightTypes.some((item) => item.value === 'flight-type-passenger')).toBe(true);
    expect(lookups).not.toHaveProperty('scheduleTemplates');
    expect(lookups).not.toHaveProperty('capacityProfiles');

    const preview = services.flightOperations.ratePreview({
      routeId: 'route-djj-wmx',
      flightTypeId: 'flight-type-passenger',
      serviceTypeId: 'flight-service-type-scheduled-passenger',
      quantity: 3,
      date: '2026-07-12'
    });

    expect(preview.rateCode).toBe('PAX_DJJ_WMX');
    expect(preview.estimatedTotal).toBe(5_400_000);

    const schedulePassengerPreview = services.flightOperations.ratePreview({
      routeId: 'route-djj-wmx',
      flightTypeId: 'flight-type-cargo',
      serviceTypeId: 'flight-service-type-scheduled-passenger',
      bookingChannel: 'COUNTER',
      passengerType: 'ADULT',
      quantity: 2,
      date: '2026-07-12'
    });

    expect(schedulePassengerPreview.rateCode).toBe('PAX_DJJ_WMX');
    expect(schedulePassengerPreview.estimatedTotal).toBe(3_600_000);

    sqlite.close();
  });

  it('blocks readiness when PIC license or medical is expired', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const blocked = services.flightOperations.detail('fop-blocked-crew-expired');
    const crewGate = blocked.readinessChecks.find(
      (check) => check.checkCode === 'CREW_LICENSE_MEDICAL'
    );

    expect(blocked.currentStatus).toBe('BLOCKED');
    expect(crewGate?.status).toBe('FAIL');
    expect(blocked.blockingReason).toContain('PIC licence');

    sqlite.close();
  });

  it('moves a valid draft through readiness approval', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const created = services.flightOperations.create(
      {
        flightDate: '2026-07-09',
        flightTypeId: 'flight-type-charter',
        serviceTypeId: 'flight-service-type-charter-cargo',
        priorityId: 'flight-priority-normal',
        routeId: 'route-djj-wmx',
        customerId: 'cust-papua-logistics',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: '2026-07-09T01:00:00.000Z',
        scheduledArrivalAt: '2026-07-09T02:05:00.000Z',
        remarks: 'Automated service test'
      },
      occActor
    );

    sqlite
      .prepare(
        `UPDATE flight_manifests SET status_id = 'manifest-status-approved', updated_at = ? WHERE flight_operation_id = ?`
      )
      .run(new Date().toISOString(), created.id);

    services.flightOperations.createFuel(
      {
        flightId: created.id,
        fuelSupplierId: 'fuel-pertamina-djj',
        fuelType: 'AVTUR',
        requestedQuantityLitre: 700,
        referencePricePerLitre: 18500
      },
      occActor
    );
    const fuel = services.flightOperations.listFuel({ flightId: created.id })[0];
    expect(fuel).toBeDefined();
    services.flightOperations.fuelAction(
      fuel.id,
      'approve',
      { approvedQuantityLitre: 700 },
      adminActor
    );
    services.flightOperations.fuelAction(
      fuel.id,
      'uplift',
      { actualUpliftLitre: 690, actualPricePerLitre: 18500 },
      adminActor
    );
    const fuelPosted = services.flightOperations.fuelAction(fuel.id, 'post', {}, adminActor);
    const fuelHandoff = fuelPosted.financeHandoffs.find(
      (handoff) => handoff.sourceType === 'fuel' && handoff.sourceId === fuel.id
    );
    expect(fuelHandoff).toMatchObject({
      eventType: 'FUEL_COST_DRAFT',
      status: 'READY',
      amount: 12765000
    });

    services.flightOperations.createStationService(
      {
        flightId: created.id,
        stationId: 'st-djj',
        serviceSupplierId: 'hp-angkasa-djj',
        serviceTypeId: 'station-service-type-handling',
        referenceRate: 2750000
      },
      occActor
    );
    const stationService = services.flightOperations.listStationServices({
      flightId: created.id
    })[0];
    expect(stationService).toBeDefined();
    services.flightOperations.confirmStationService(stationService.id, adminActor);

    const submitted = services.flightOperations.submit(created.id, occActor);
    expect(['PENDING_READINESS', 'READY_FOR_APPROVAL']).toContain(submitted.currentStatus);

    const evaluated = services.flightOperations.evaluate(created.id, occActor);
    expect(evaluated.currentStatus).toBe('READY_FOR_APPROVAL');
    expect(
      evaluated.readinessChecks.every((check) => ['PASS', 'NOT_APPLICABLE'].includes(check.status))
    ).toBe(true);

    const approved = services.flightOperations.approve(created.id, {}, adminActor);
    expect(approved.currentStatus).toBe('APPROVED');
    expect(approved.approvedByUserId).toBe('USR-DEMO-ADMIN');

    sqlite.close();
  });

  it('keeps flight requests separate and converts an approved request into a linked order', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const request = services.flightOperations.createRequest(
      {
        flightDate: '2026-07-12',
        flightTypeId: 'flight-type-cargo',
        serviceTypeId: 'flight-service-type-charter-cargo',
        routeId: 'route-djj-wmx',
        customerId: 'cust-papua-logistics',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: '2026-07-12T00:30:00.000Z',
        scheduledArrivalAt: '2026-07-12T01:45:00.000Z',
        requestSource: 'Corporate Charter Request',
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
        remarks: 'Separate request conversion test'
      },
      'USR-001'
    );

    expect(request.requestNumber).toMatch(/^FR-2026-/u);
    expect(
      services.flightOperations.list({ search: request.requestNumber, limit: 20, offset: 0 })
        .flights
    ).toHaveLength(0);

    services.flightOperations.submitRequest(request.id);
    expect(() =>
      services.flightOperations.decideRequest(
        request.id,
        { decision: 'APPROVE', reason: 'Creator must not approve.' },
        'USR-001'
      )
    ).toThrowError(expect.objectContaining({ code: 'SELF_APPROVAL_BLOCKED' }));
    const result = services.flightOperations.decideRequest(
      request.id,
      { decision: 'APPROVE', reason: 'Operational request accepted.' },
      'USR-DEMO-ADMIN'
    );

    expect(result.request.status).toBe('CONVERTED');
    if (!result.flight) throw new Error('Expected converted Flight Order');
    expect(result.flight.flightRequestId).toBe(request.id);
    expect(result.flight.requestNumber).toBe(request.requestNumber);
    expect(result.flight.orderNumber).toMatch(/^FO-2026-/u);
    expect(result.flight.flightNumber).toMatch(/^FL-2026-/u);

    sqlite.close();
  });

  it('blocks readiness when aircraft current station is not the departure station', async () => {
    const { services, sqlite } = await createSeededTestServices();

    sqlite
      .prepare(
        `UPDATE aircraft
         SET current_station_id = 'st-wmx', next_maintenance_due_at = '2026-08-15'
         WHERE id = 'ac-pk-ama'`
      )
      .run();

    const created = createReadinessDraft(services);
    const evaluated = services.flightOperations.evaluate(created.id, occActor);
    const location = evaluated.readinessChecks.find(
      (check) => check.checkCode === 'AIRCRAFT_LOCATION'
    );

    expect(evaluated.currentStatus).toBe('BLOCKED');
    expect(location?.status).toBe('FAIL');
    expect(location?.sourceReference).toBe('aircraft.current_station_id');
    expect(location?.resultNote).toContain('current station WMX');

    sqlite.close();
  });

  it('blocks readiness when aircraft current station is missing', async () => {
    const { services, sqlite } = await createSeededTestServices();

    sqlite.prepare(`UPDATE aircraft SET current_station_id = NULL WHERE id = 'ac-pk-ama'`).run();

    const created = createReadinessDraft(services);
    const evaluated = services.flightOperations.evaluate(created.id, occActor);
    const location = evaluated.readinessChecks.find(
      (check) => check.checkCode === 'AIRCRAFT_LOCATION'
    );

    expect(evaluated.currentStatus).toBe('BLOCKED');
    expect(location?.status).toBe('FAIL');
    expect(location?.resultNote).toContain('current station unknown');

    sqlite.close();
  });

  it('blocks readiness when selected crew is not available in master data', async () => {
    const { services, sqlite } = await createSeededTestServices();

    sqlite
      .prepare(
        `UPDATE crews
         SET availability_status = 'ON_LEAVE'
         WHERE id = 'crew-cop-valid'`
      )
      .run();

    const created = createReadinessDraft(services);
    const evaluated = services.flightOperations.evaluate(created.id, occActor);
    const crewAvailability = evaluated.readinessChecks.find(
      (check) => check.checkCode === 'CREW_AVAILABILITY'
    );

    expect(evaluated.currentStatus).toBe('BLOCKED');
    expect(crewAvailability?.status).toBe('FAIL');
    expect(crewAvailability?.sourceReference).toBe('crews.availability_status');
    expect(crewAvailability?.resultNote).toContain('ON_LEAVE');

    sqlite.close();
  });

  it('blocks readiness when aircraft maintenance is due before scheduled departure', async () => {
    const { services, sqlite } = await createSeededTestServices();

    sqlite
      .prepare(
        `UPDATE aircraft
         SET serviceability_status = 'SERVICEABLE',
             current_station_id = 'st-djj',
             next_maintenance_due_at = '2026-07-13'
         WHERE id = 'ac-pk-ama'`
      )
      .run();

    const created = createReadinessDraft(services);
    const evaluated = services.flightOperations.evaluate(created.id, occActor);
    const serviceability = evaluated.readinessChecks.find(
      (check) => check.checkCode === 'AIRCRAFT_SERVICEABILITY'
    );

    expect(evaluated.currentStatus).toBe('BLOCKED');
    expect(serviceability?.status).toBe('FAIL');
    expect(serviceability?.resultNote).toContain('maintenance is due on 2026-07-13');

    sqlite.close();
  });

  it('rejects closure while mandatory operational evidence is incomplete', async () => {
    const { services, sqlite } = await createSeededTestServices();

    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-pending-closure'
         WHERE id = 'fop-dg-pending'`
      )
      .run();
    const detail = services.flightOperations.detail('fop-dg-pending');
    expect(detail.closureReadiness).toEqual({
      allowed: false,
      missing: expect.arrayContaining([
        'actual departure/arrival',
        'final manifest',
        'actual fuel uplift',
        'approved station cost'
      ])
    });
    expect(() => services.flightOperations.closeFlight('fop-dg-pending', adminActor)).toThrow(
      'Flight cannot be closed'
    );

    sqlite.close();
  });

  it('allows closure when all mandatory operational evidence is complete', async () => {
    const { services, sqlite } = await createSeededTestServices();

    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-pending-closure', is_locked = 0
         WHERE id = 'fop-closed-djj-wmx'`
      )
      .run();

    const detail = services.flightOperations.detail('fop-closed-djj-wmx');
    expect(detail.closureReadiness).toEqual({ allowed: true, missing: [] });
    expect(
      services.flightOperations.closeFlight('fop-closed-djj-wmx', adminActor).currentStatus
    ).toBe('CLOSED');
    expect(
      services.flightOperations.closeFlight('fop-closed-djj-wmx', adminActor).currentStatus
    ).toBe('CLOSED');
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM invoices
           WHERE flight_operation_id = 'fop-closed-djj-wmx'`
        )
        .get()
    ).toEqual({ count: 1 });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM invoice_finance_snapshots
           WHERE flight_operation_id = 'fop-closed-djj-wmx'`
        )
        .get()
    ).toEqual({ count: 1 });
    expect(
      sqlite
        .prepare(
          `SELECT status_id FROM flight_finance_handoffs
           WHERE id = 'fop-closed-djj-wmx-handoff-invoice'`
        )
        .get()
    ).toEqual({ status_id: 'finance-handoff-status-posted' });

    sqlite.close();
  });

  it('rejects closure without canonical invoice ownership data', async () => {
    const { services, sqlite } = await createSeededTestServices();

    sqlite.prepare("DELETE FROM payments WHERE invoice_id = 'inv-closed-djj-wmx'").run();
    sqlite.prepare("DELETE FROM invoices WHERE id = 'inv-closed-djj-wmx'").run();
    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-pending-closure',
             estimated_revenue = NULL, is_locked = 0
         WHERE id = 'fop-closed-djj-wmx'`
      )
      .run();

    const detail = services.flightOperations.detail('fop-closed-djj-wmx');
    expect(detail.closureReadiness.missing).toContain('invoice customer/revenue');
    expect(() => services.flightOperations.closeFlight('fop-closed-djj-wmx', adminActor)).toThrow(
      'invoice customer/revenue'
    );
    expect(
      sqlite
        .prepare(
          `SELECT status.code AS status
           FROM flight_operations flight
           JOIN flight_operation_statuses status ON status.id = flight.current_status_id
           WHERE flight.id = 'fop-closed-djj-wmx'`
        )
        .get()
    ).toEqual({ status: 'PENDING_CLOSURE' });

    sqlite.close();
  });

  it('rolls back closure when the immutable finance snapshot cannot be created', async () => {
    const { services, sqlite } = await createSeededTestServices();

    sqlite.prepare("DELETE FROM payments WHERE invoice_id = 'inv-closed-djj-wmx'").run();
    sqlite.prepare("DELETE FROM invoices WHERE id = 'inv-closed-djj-wmx'").run();
    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-pending-closure', is_locked = 0
         WHERE id = 'fop-closed-djj-wmx'`
      )
      .run();
    sqlite.exec(
      `CREATE TRIGGER reject_invoice_snapshot_insert
       BEFORE INSERT ON invoice_finance_snapshots
       BEGIN
         SELECT RAISE(ABORT, 'invoice snapshot insert rejected by test');
       END`
    );

    expect(() => services.flightOperations.closeFlight('fop-closed-djj-wmx', adminActor)).toThrow(
      'invoice snapshot insert rejected by test'
    );
    expect(
      sqlite
        .prepare(
          `SELECT status.code AS status, flight.is_locked AS isLocked
           FROM flight_operations flight
           JOIN flight_operation_statuses status ON status.id = flight.current_status_id
           WHERE flight.id = 'fop-closed-djj-wmx'`
        )
        .get()
    ).toEqual({ status: 'PENDING_CLOSURE', isLocked: 0 });
    expect(
      sqlite
        .prepare(
          `SELECT status.code AS status
           FROM flight_finance_handoffs handoff
           JOIN finance_handoff_statuses status ON status.id = handoff.status_id
           WHERE handoff.id = 'fop-closed-djj-wmx-handoff-invoice'`
        )
        .get()
    ).toEqual({ status: 'POSTED' });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM invoices
           WHERE flight_operation_id = 'fop-closed-djj-wmx'`
        )
        .get()
    ).toEqual({ count: 0 });

    sqlite.close();
  });
});
