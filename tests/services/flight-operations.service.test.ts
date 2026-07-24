import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

const occActor = 'USR-001';
const adminActor = 'USR-ADMIN';

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
  it('represents ON_DUTY crew as assigned rather than unavailable', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const scheduled = services.flightOperations.detail('fop-ticketing-passenger');
    const agus = scheduled.crewAssignments.find((crew) => crew.crewName === 'Agus Yikwa');

    expect(agus).toMatchObject({
      masterAvailabilityStatus: 'ON_DUTY',
      availabilityStatus: 'WARNING'
    });

    sqlite.close();
  });

  it('passes readiness for ON_DUTY crew assigned to the evaluated flight', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const evaluated = services.flightOperations.evaluate('fop-ticketing-passenger', occActor);
    const crewAvailability = evaluated.readinessChecks.find(
      (check) => check.checkCode === 'CREW_AVAILABILITY'
    );

    expect(crewAvailability).toMatchObject({
      status: 'PASS',
      sourceReference: 'flight_crew_assignments'
    });
    expect(crewAvailability?.resultNote).toBe('Assigned crew are available for this flight.');

    sqlite.close();
  });

  it('treats accepted dangerous goods and locked manifests as passed at departure', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const acceptedStatus = sqlite
      .prepare("SELECT id FROM dg_acceptance_statuses WHERE code = 'ACCEPTED'")
      .get() as { id: string };
    sqlite
      .prepare(
        `UPDATE flight_manifest_cargo_items
         SET dg_acceptance_status_id = ?
         WHERE id = 'fop-dg-cargo-1'`
      )
      .run(acceptedStatus.id);
    sqlite
      .prepare(
        `UPDATE flight_manifests
         SET status_id = 'manifest-status-locked'
         WHERE flight_operation_id = 'fop-dg-pending'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-check-in-closed'
         WHERE id = 'fop-dg-pending'`
      )
      .run();

    const evaluated = services.flightOperations.evaluateDepartureAssurance('fop-dg-pending', {
      userId: occActor,
      role: 'OCC',
      stationCodes: ['ALL']
    });
    expect(
      evaluated.readinessChecks.find((check) => check.checkCode === 'DG_ACCEPTANCE')
    ).toMatchObject({ status: 'PASS', calculationStatus: 'PASS' });
    expect(
      evaluated.readinessChecks.find((check) => check.checkCode === 'MANIFEST_APPROVED')
    ).toMatchObject({ status: 'PASS', calculationStatus: 'PASS' });
    expect(
      evaluated.readinessChecks.find((check) => check.checkCode === 'MANIFEST_LOCKED')
    ).toMatchObject({ status: 'PASS', calculationStatus: 'PASS' });

    sqlite.close();
  });

  it('compares the actual readiness approver with the flight creator', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flight = sqlite
      .prepare(
        `SELECT created_by_user_id
         FROM flight_operations WHERE id = 'fop-ticketing-passenger'`
      )
      .get() as { created_by_user_id: string };
    sqlite
      .prepare(
        `UPDATE flight_operation_approvals
         SET decided_by_user_id = ?
         WHERE flight_id = 'fop-ticketing-passenger'
           AND approval_type_id = 'flight-approval-type-readiness-approval'`
      )
      .run(flight.created_by_user_id);

    let evaluated = services.flightOperations.evaluate('fop-ticketing-passenger', occActor);
    expect(
      evaluated.readinessChecks.find((check) => check.checkCode === 'SEPARATION_OF_DUTIES')
    ).toMatchObject({ status: 'FAIL', effectiveStatus: 'BLOCKED' });

    sqlite
      .prepare(
        `UPDATE flight_operation_approvals
         SET decided_by_user_id = ?
         WHERE flight_id = 'fop-ticketing-passenger'
           AND approval_type_id = 'flight-approval-type-readiness-approval'`
      )
      .run(adminActor);
    evaluated = services.flightOperations.evaluate('fop-ticketing-passenger', occActor);
    expect(
      evaluated.readinessChecks.find((check) => check.checkCode === 'SEPARATION_OF_DUTIES')
    ).toMatchObject({ status: 'PASS', effectiveStatus: 'PASSED' });

    sqlite.close();
  });

  it('seeds a complete charter draft that is ready to submit', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const draft = services.flightOperations.requestDetail('fr-charter-draft');
    expect(draft).toMatchObject({
      status: 'DRAFT',
      aircraftId: 'ac-pk-ama',
      pilotInCommandId: 'crew-pic-valid',
      coPilotId: 'crew-cop-valid'
    });

    const submitted = services.flightOperations.submitRequest(draft.id);
    expect(submitted.status).toBe('SUBMITTED');

    sqlite.close();
  });

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

  it('builds a route-aware planning context with explainable aircraft and crew candidates', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const context = await services.flightOperations.planningContext({
      routeId: 'route-djj-wmx',
      flightDate: '2026-08-20',
      serviceTypeId: 'flight-service-type-scheduled-passenger',
      scheduledDepartureAt: '2026-08-20T01:00:00.000Z',
      scheduledArrivalAt: '2026-08-20T02:00:00.000Z',
      passengerEstimate: 6,
      cargoWeightEstimateKg: 100
    });

    expect(context.routeReadiness.availableForScheduling).toBe(true);
    expect(context.scheduleTemplates.length).toBeGreaterThan(0);
    expect(context.capacityProfiles.length).toBeGreaterThan(0);
    expect(context.aircraftCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ac-pk-ama',
          currentStationCode: 'DJJ',
          available: true,
          blockers: []
        })
      ])
    );
    expect(context.crewCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'crew-pic-valid', available: true }),
        expect.objectContaining({ id: 'crew-pic-expiring', available: false })
      ])
    );

    const occupiedFlight = services.flightOperations.detail('fop-ticketing-passenger');
    const occupiedContext = await services.flightOperations.planningContext({
      routeId: occupiedFlight.routeId,
      flightDate: occupiedFlight.flightDate,
      serviceTypeId: occupiedFlight.serviceTypeId,
      scheduledDepartureAt: occupiedFlight.scheduledDepartureAt ?? undefined,
      scheduledArrivalAt: occupiedFlight.scheduledArrivalAt ?? undefined,
      passengerEstimate: 1,
      cargoWeightEstimateKg: 0
    });
    expect(
      occupiedContext.aircraftCandidates.find((candidate) => candidate.id === 'ac-pk-ama')
    ).toMatchObject({
      available: false,
      blockers: expect.arrayContaining(['Aircraft is assigned to another overlapping flight.'])
    });

    const blockedRoute = await services.flightOperations.planningContext({
      routeId: 'route-tim-dex',
      flightDate: '2026-08-20',
      serviceTypeId: 'flight-service-type-charter-cargo'
    });
    expect(blockedRoute.routeReadiness.availableForScheduling).toBe(false);
    expect(() =>
      services.flightOperations.createRequest(
        {
          flightDate: '2026-08-20',
          flightTypeId: 'flight-type-cargo',
          serviceTypeId: 'flight-service-type-charter-cargo',
          routeId: 'route-tim-dex',
          customerId: 'cust-papua-logistics',
          aircraftId: null,
          pilotInCommandId: null,
          coPilotId: null,
          scheduledDepartureAt: null,
          scheduledArrivalAt: null,
          requestSource: 'Cargo Booking',
          priorityId: 'flight-priority-normal',
          passengerEstimate: 0,
          cargoWeightEstimateKg: 100,
          cargoCategory: 'General Cargo',
          dangerousGoods: false,
          fuelType: 'AVTUR',
          requestedFuelLitre: 0,
          fuelSupplierId: null,
          handlingSupplierId: null,
          parkingRequired: false,
          destinationHandlingRequired: false,
          billingType: 'CARGO',
          estimatedRevenue: null,
          remarks: null
        },
        occActor
      )
    ).toThrowError(expect.objectContaining({ code: 'ROUTE_BLOCKED' }));

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

  it('evaluates crew documents against the scheduled flight date', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const created = services.flightOperations.create(
      {
        flightDate: '2026-08-20',
        flightTypeId: 'flight-type-charter',
        serviceTypeId: 'flight-service-type-charter-passenger',
        priorityId: 'flight-priority-normal',
        routeId: 'route-djj-wmx',
        customerId: 'cust-papua-logistics',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-expiring',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: '2026-08-20T01:00:00.000Z',
        scheduledArrivalAt: '2026-08-20T02:00:00.000Z',
        remarks: 'Future crew document check'
      },
      occActor
    );

    const evaluated = services.flightOperations.evaluate(created.id, occActor);
    expect(
      evaluated.readinessChecks.find((check) => check.checkCode === 'CREW_LICENSE_MEDICAL')
    ).toMatchObject({ status: 'FAIL' });

    sqlite.close();
  });

  it('marks commercial-only planning checks not applicable for a positioning flight', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const created = services.flightOperations.create(
      {
        flightDate: '2026-08-20',
        flightTypeId: 'flight-type-charter',
        serviceTypeId: 'flight-service-type-positioning',
        priorityId: 'flight-priority-normal',
        routeId: 'route-djj-wmx',
        customerId: null,
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: '2026-08-20T03:00:00.000Z',
        scheduledArrivalAt: '2026-08-20T04:00:00.000Z',
        remarks: 'Positioning readiness matrix'
      },
      occActor
    );

    const evaluated = services.flightOperations.evaluate(created.id, occActor);
    for (const code of ['FINANCE_INITIALIZED', 'PLANNING_DOCUMENTS']) {
      expect(evaluated.readinessChecks.find((check) => check.checkCode === code)).toMatchObject({
        status: 'NOT_APPLICABLE'
      });
    }
    for (const code of [
      'MANIFEST_APPROVED',
      'MANIFEST_LOCKED',
      'DG_ACCEPTANCE',
      'FUEL_CONFIRMED',
      'HANDLING_CONFIRMED',
      'DEPARTURE_DOCUMENTS',
      'ORIGIN_OPERATIONAL_TASKS'
    ]) {
      expect(evaluated.readinessChecks.some((check) => check.checkCode === code)).toBe(false);
    }

    sqlite.close();
  });

  it('allows a system-ready draft to proceed before departure verification', async () => {
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
      evaluated.readinessChecks.find((check) => check.checkCode === 'PLANNING_DOCUMENTS')
    ).toMatchObject({ effectiveStatus: 'PASSED' });
    expect(services.flightOperations.approve(created.id, {}, adminActor).currentStatus).toBe(
      'APPROVED'
    );

    sqlite.close();
  });

  it('keeps flight requests separate and converts an approved request into a linked order', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const request = services.flightOperations.createRequest(
      {
        flightDate: '2026-07-12',
        flightTypeId: 'flight-type-passenger',
        serviceTypeId: 'flight-service-type-scheduled-passenger',
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
        cargoWeightEstimateKg: 100,
        cargoCategory: 'General Cargo',
        dangerousGoods: false,
        fuelType: 'AVTUR',
        requestedFuelLitre: 850,
        fuelSupplierId: 'fuel-pertamina-djj',
        handlingSupplierId: 'hp-angkasa-djj',
        parkingRequired: true,
        destinationHandlingRequired: true,
        billingType: 'SCHEDULED_PASSENGER',
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
      'USR-ADMIN'
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

  it('builds enriched maintenance workbench records and posts approved maintenance cost', async () => {
    const { services, sqlite } = await createSeededTestServices();

    expect(() =>
      services.flightOperations.createMaintenance(
        {
          flightId: 'fop-in-progress',
          aircraftId: 'ac-pk-ama',
          serviceabilityStatusId: 'aircraft-serviceability-status-serviceable',
          workOrderReference: 'WO-WRONG-AIRCRAFT',
          maintenanceNote: null,
          sparePartReference: null,
          maintenanceCost: 0,
          currencyId: 'cur-idr'
        },
        adminActor
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_AIRCRAFT_MISMATCH' }));

    const standaloneResult = services.flightOperations.createMaintenance(
      {
        flightId: null,
        aircraftId: 'ac-pk-ama',
        serviceabilityStatusId: 'aircraft-serviceability-status-serviceable',
        workOrderReference: 'WO-STANDALONE',
        maintenanceNote: null,
        sparePartReference: null,
        maintenanceCost: 0,
        currencyId: 'cur-idr'
      },
      adminActor
    );
    expect(Array.isArray(standaloneResult)).toBe(true);
    expect(
      Array.isArray(standaloneResult)
        ? standaloneResult.find((handoff) => handoff.flightId === null)
        : null
    ).toMatchObject({
      closureReady: false,
      needsAttention: true,
      attentionReasons: expect.arrayContaining(['Maintenance handoff is not linked to a flight'])
    });

    const pending = services.flightOperations
      .listMaintenance({ search: 'AMA-20260717-005', status: 'DRAFT', stationId: 'st-wmx' })
      .at(0);
    expect(pending).toMatchObject({
      id: 'fop-in-progress-maintenance-draft',
      routeCode: 'WMX-OKS',
      serviceabilityStatus: 'SERVICEABLE',
      handoffServiceabilityStatus: 'SERVICEABLE_WITH_RESTRICTIONS',
      pendingApproval: true,
      evidenceComplete: false,
      blockers: expect.arrayContaining([
        'Maintenance approval is missing',
        'Work order evidence has not been recorded'
      ])
    });

    services.flightOperations.approveMaintenance('fop-in-progress-maintenance-draft', adminActor);
    expect(
      sqlite
        .prepare(
          `SELECT amount FROM flight_finance_handoffs
           WHERE source_id = 'fop-in-progress-maintenance-draft'
             AND event_type_id = 'finance-event-type-maintenance-expense-draft'`
        )
        .get()
    ).toEqual({ amount: 1250000 });
    expect(
      services.flightOperations.listMaintenance({ flightId: 'fop-in-progress' }).at(0)
    ).toMatchObject({
      approvedMaintenanceCost: 1250000,
      fuelCost: 9250000,
      stationCost: 2750000,
      totalOperationalCost: 13250000,
      financeCurrencyCode: 'IDR',
      financeCurrencyMismatch: false
    });

    expect(() =>
      services.flightOperations.approveMaintenance('fop-in-progress-maintenance-draft', adminActor)
    ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));
    expect(() =>
      services.flightOperations.approveMaintenance(
        'fop-cancelled-maintenance-unserviceable',
        adminActor
      )
    ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));

    sqlite
      .prepare(
        "UPDATE aircraft SET serviceability_status = 'SERVICEABLE_WITH_RESTRICTIONS' WHERE id = 'ac-pk-amb'"
      )
      .run();
    expect(
      services.flightOperations.listMaintenance({ flightId: 'fop-in-progress' }).at(0)
    ).toMatchObject({
      closureReady: false,
      needsAttention: true,
      attentionReasons: ['Aircraft is serviceable with restrictions and requires review']
    });

    sqlite
      .prepare(
        "UPDATE flight_station_costs SET currency_id = 'cur-usd' WHERE flight_id = 'fop-in-progress'"
      )
      .run();
    expect(
      services.flightOperations.listMaintenance({ flightId: 'fop-in-progress' }).at(0)
    ).toMatchObject({
      financeCurrencyMismatch: true,
      fuelCost: null,
      stationCost: null,
      approvedMaintenanceCost: null,
      totalOperationalCost: null,
      projectedGrossMargin: null
    });

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
        'approved station cost',
        'approved maintenance handoff'
      ])
    });
    expect(() => services.flightOperations.closeFlight('fop-dg-pending', adminActor)).toThrow(
      'Flight cannot be closed'
    );

    sqlite.close();
  });

  it('returns structured verification-aware closure blockers', async () => {
    const { services, sqlite } = await createSeededTestServices();

    let thrown: unknown;
    try {
      services.flightOperations.validateClosureRequirements(
        'fop-pending-closure',
        services.flightOperations.detail('fop-pending-closure').serviceTypeCode
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: 'CLOSURE_VALIDATION_FAILED',
      details: {
        requirements: expect.arrayContaining([
          expect.objectContaining({
            code: 'DESTINATION_STATION_SIGNOFF',
            status: 'BLOCKED',
            required: true
          }),
          expect.objectContaining({
            code: 'RECONCILIATION',
            status: 'BLOCKED',
            required: true
          })
        ])
      }
    });

    sqlite.close();
  });

  it('does not persist departure time when the status transition is invalid', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = services.flightOperations.detail('fop-in-progress');

    expect(() =>
      services.flightOperations.depart(
        'fop-in-progress',
        { actualAt: '2026-07-19T01:00:00.000Z', note: 'Duplicate departure attempt' },
        occActor
      )
    ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));

    const after = services.flightOperations.detail('fop-in-progress');
    expect(after.actualDepartureAt).toBe(before.actualDepartureAt);
    expect(after.currentStatus).toBe('IN_PROGRESS');

    sqlite.close();
  });

  it('records landing atomically and moves the aircraft to the actual arrival station', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = services.flightOperations.detail('fop-in-progress');
    const actualAt = new Date(
      new Date(String(before.actualDepartureAt)).getTime() + 30 * 60_000
    ).toISOString();

    const landed = services.flightOperations.land(
      'fop-in-progress',
      { actualAt, stationId: before.destinationStationId, note: 'Arrival recorded by OCC' },
      occActor
    );

    expect(landed).toMatchObject({
      currentStatus: 'LANDED',
      actualArrivalAt: actualAt,
      actualArrivalStationId: before.destinationStationId
    });
    expect(
      sqlite.prepare('SELECT current_station_id FROM aircraft WHERE id = ?').get(before.aircraftId!)
    ).toEqual({ current_station_id: before.destinationStationId });

    sqlite.close();
  });

  it('rejects an arrival before departure without changing flight or aircraft state', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = services.flightOperations.detail('fop-in-progress');
    const aircraftBefore = sqlite
      .prepare('SELECT current_station_id FROM aircraft WHERE id = ?')
      .get(before.aircraftId!);

    expect(() =>
      services.flightOperations.land(
        'fop-in-progress',
        { actualAt: '2000-01-01T00:00:00.000Z' },
        occActor
      )
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ACTUAL_TIME' }));

    expect(services.flightOperations.detail('fop-in-progress').actualArrivalAt).toBeNull();
    expect(
      sqlite.prepare('SELECT current_station_id FROM aircraft WHERE id = ?').get(before.aircraftId!)
    ).toEqual(aircraftBefore);

    sqlite.close();
  });

  it('keeps the planned destination when a flight is diverted and permits closure preparation', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = services.flightOperations.detail('fop-in-progress');

    const diverted = services.flightOperations.divert(
      'fop-in-progress',
      {
        reasonId: 'reason-weather',
        reasonNote: 'Weather below minima at destination.',
        diversionStationId: 'st-djj'
      },
      occActor
    );

    expect(diverted).toMatchObject({
      currentStatus: 'DIVERTED',
      destinationStationId: before.destinationStationId,
      actualArrivalStationId: 'st-djj'
    });
    expect(
      sqlite.prepare('SELECT current_station_id FROM aircraft WHERE id = ?').get(before.aircraftId!)
    ).toEqual({ current_station_id: 'st-djj' });
    expect(
      services.flightOperations.transition('fop-in-progress', 'PENDING_CLOSURE', occActor)
        .currentStatus
    ).toBe('PENDING_CLOSURE');

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
    sqlite
      .prepare(
        `UPDATE flight_maintenance_handoffs
         SET status_id = 'maintenance-handoff-status-posted'
         WHERE id = 'fop-closed-maintenance'`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO passenger_tickets (
          id, flight_operation_id, passenger_name, document_type, document_number, seat_number,
          passenger_weight_kg, baggage_weight_kg, ticket_price, rate_card_id, tax_code_id,
          tax_code, tax_rate_basis_points, tax_amount, total_amount, currency_code, ticket_status,
          payment_status, payment_method, paid_at, check_in_status, checked_in_at, agent_id,
          created_at, updated_at
        ) VALUES (
          'test-closed-flight-ticket', 'fop-closed-djj-wmx', 'Test Passenger', 'KTP',
          'KTP-TEST-CLOSED', '9A', 70, 10, 1800000, 'rate-passenger-djj-wmx',
          'tax-non-tax', 'NON_TAX', 0, 0, 1800000, 'IDR', 'ACTIVE', 'PAID',
          'TRANSFER', '2026-07-07T01:00:00.000Z', 'CHECKED_IN',
          '2026-07-07T02:00:00.000Z', 'agent-djj-counter',
          '2026-07-07T01:00:00.000Z', '2026-07-07T02:00:00.000Z'
        )`
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
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM accounting_events event
           JOIN journal_entries journal ON journal.accounting_event_id = event.id
           WHERE event.event_type = 'PASSENGER_SERVICE_FULFILLED'
             AND event.source_id = 'test-closed-flight-ticket'
             AND journal.status = 'POSTED'`
        )
        .get()
    ).toEqual({ count: 1 });

    sqlite.close();
  });

  it('rejects closure when the approved handoff belongs to another aircraft', async () => {
    const { services, sqlite } = await createSeededTestServices();

    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-pending-closure', is_locked = 0
         WHERE id = 'fop-closed-djj-wmx'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE flight_maintenance_handoffs
         SET aircraft_id = 'ac-pk-amb'
         WHERE flight_id = 'fop-closed-djj-wmx'`
      )
      .run();

    const detail = services.flightOperations.detail('fop-closed-djj-wmx');
    expect(detail.closureReadiness).toEqual({
      allowed: false,
      missing: ['approved maintenance handoff']
    });
    expect(() => services.flightOperations.closeFlight('fop-closed-djj-wmx', adminActor)).toThrow(
      'Flight cannot be closed'
    );

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
