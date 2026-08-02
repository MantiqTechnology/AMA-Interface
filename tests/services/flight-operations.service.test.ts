import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

const occActor = 'USR-001';
const occCheckerActor = 'USR-OCC-CHECKER';
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
  it('derives actor-aware lifecycle capabilities instead of exposing status-only actions', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flightId = 'fop-ticketing-passenger';
    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-approved'
         WHERE id = ?`
      )
      .run(flightId);

    const occ = services.flightOperations.detailForActor(flightId, {
      userId: occActor,
      role: 'OCC',
      stationCodes: ['ALL']
    });
    const director = services.flightOperations.detailForActor(flightId, {
      userId: 'USR-DIRECTOR',
      role: 'Director',
      stationCodes: ['ALL']
    });

    expect(occ.commandCenter?.lifecycle.currentPhase).toBe('APPROVAL');
    expect(
      occ.commandCenter?.capabilities.find((capability) => capability.action === 'schedule')
    ).toMatchObject({ visible: true, allowed: true, permissionGranted: true });
    expect(
      director.commandCenter?.capabilities.find((capability) => capability.action === 'schedule')
    ).toMatchObject({
      visible: true,
      allowed: false,
      permissionGranted: false,
      blockedReasons: [
        expect.objectContaining({
          code: 'PERMISSION_DENIED',
          domain: 'PERMISSION',
          ownerRoleCode: 'OCC'
        })
      ]
    });

    sqlite.close();
  });

  it('rejects cancellation after actual departure without changing flight state', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flightId = 'fop-ticketing-passenger';
    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-in-progress',
             actual_departure_at = '2026-07-17T01:00:00.000Z'
         WHERE id = ?`
      )
      .run(flightId);

    expect(() =>
      services.flightOperations.cancel(
        flightId,
        {
          reasonId: 'reason-weather',
          reasonNote: 'Cancellation must not be accepted after departure.'
        },
        occActor
      )
    ).toThrowError(expect.objectContaining({ code: 'AIRBORNE_CANCELLATION_FORBIDDEN' }));
    expect(services.flightOperations.detail(flightId).currentStatus).toBe('IN_PROGRESS');

    sqlite.close();
  });

  it('applies a versioned lifecycle command once and rejects stale commands', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flightId = 'fop-ticketing-passenger';
    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-approved', version = 7
         WHERE id = ?`
      )
      .run(flightId);
    const command = {
      expectedVersion: 7,
      idempotencyKey: `${flightId}:schedule:test-command`
    };

    const first = services.flightOperations.transition(flightId, 'SCHEDULED', occActor, command);
    const repeated = services.flightOperations.transition(flightId, 'SCHEDULED', occActor, command);

    expect(first.version).toBe(8);
    expect(repeated.version).toBe(8);
    expect(
      (
        sqlite
          .prepare(
            `SELECT COUNT(*) AS count FROM flight_status_histories
             WHERE flight_id = ? AND action_type_id = 'flight-action-type-schedule'`
          )
          .get(flightId) as { count: number }
      ).count
    ).toBe(1);
    expect(() =>
      services.flightOperations.transition(flightId, 'CHECK_IN_OPEN', occActor, {
        expectedVersion: 7,
        idempotencyKey: `${flightId}:open-check-in:stale`
      })
    ).toThrowError(expect.objectContaining({ code: 'FLIGHT_VERSION_CONFLICT' }));

    sqlite.close();
  });

  it('requires correction scope and records the previous lifecycle snapshot when reopening', async () => {
    const { services, sqlite } = await createSeededTestServices();

    expect(() =>
      services.flightOperations.reopen(
        'fop-closed-djj-wmx',
        { reasonId: 'reason-data-correction', reasonNote: 'Correct arrival evidence.' },
        adminActor
      )
    ).toThrowError(expect.objectContaining({ code: 'REOPEN_SCOPE_REQUIRED' }));

    const before = services.flightOperations.detail('fop-closed-djj-wmx');
    const reopened = services.flightOperations.reopen(
      'fop-closed-djj-wmx',
      {
        reasonId: 'reason-data-correction',
        reasonNote: 'Correct arrival evidence.',
        correctionScope: 'ARRIVAL'
      },
      adminActor
    );
    const event = reopened.histories.find((history) => history.actionType === 'REOPEN');

    expect(reopened.currentStatus).toBe('REOPENED_FOR_CORRECTION');
    expect(event?.metadata).toMatchObject({
      correctionScope: 'ARRIVAL',
      previousStatus: 'CLOSED',
      previousVersion: before.version,
      expectedResultingStatus: 'PENDING_CLOSURE'
    });

    sqlite.close();
  });

  it('previews selective aircraft-change invalidation without mutating the flight', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flightId = 'fop-ticketing-passenger';
    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-approved'
         WHERE id = ?`
      )
      .run(flightId);
    const before = services.flightOperations.detail(flightId);

    const preview = services.flightOperations.previewFlightChange(
      flightId,
      {
        changeType: 'AIRCRAFT_ASSIGNMENT',
        changes: { aircraftId: 'ac-pk-amb' },
        expectedVersion: before.version
      },
      { userId: occActor, role: 'OCC', stationCodes: ['ALL'] }
    );

    expect(preview).toMatchObject({
      resultingStatus: 'REAPPROVAL_REQUIRED',
      resultingPhase: 'APPROVAL',
      requiresConfirmation: true
    });
    expect(preview.invalidatedItems.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'AIRCRAFT_SERVICEABILITY',
        'AIRCRAFT_LOCATION',
        'MAINTENANCE_RELEASE'
      ])
    );
    expect(services.flightOperations.detail(flightId)).toMatchObject({
      currentStatus: before.currentStatus,
      version: before.version,
      aircraftId: before.aircraftId
    });

    sqlite.close();
  });

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

  it('calculates CASR fuel planning advisory from fuel onboard plus actual uplift', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flight = services.flightOperations.create(
      {
        flightDate: '2026-07-14',
        flightTypeId: 'flight-type-charter',
        serviceTypeId: 'flight-service-type-charter-cargo',
        priorityId: 'flight-priority-normal',
        routeId: 'route-djj-wmx',
        customerId: 'cust-papua-logistics',
        aircraftId: 'ac-pk-amb',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: '2026-07-14T01:00:00.000Z',
        scheduledArrivalAt: '2026-07-14T02:00:00.000Z',
        remarks: 'Fuel planning advisory regression'
      },
      occActor
    );
    sqlite
      .prepare('UPDATE flight_operations SET planned_taxi_fuel_litre = 15 WHERE id = ?')
      .run(flight.id);
    const withFuel = services.flightOperations.createFuel(
      {
        flightId: flight.id,
        fuelSupplierId: 'fuel-pertamina-djj',
        fuelType: 'AVTUR',
        requestedQuantityLitre: 220,
        fuelOnBoardBeforeUpliftLitre: 180,
        defuelQuantityLitre: null,
        measuredFuelOnBoardLitre: null,
        confirmedBlockFuelLitre: null,
        referencePricePerLitre: null
      },
      occActor
    );
    const fuelId = withFuel.fuelRequests[0]!.id;
    sqlite
      .prepare('UPDATE flight_fuel_requests SET actual_uplift_litre = 220 WHERE id = ?')
      .run(fuelId);

    const estimate = services.flightOperations.detail(flight.id).fuelPlanningEstimate;

    expect(estimate).toMatchObject({
      status: 'ENOUGH_FOR_PLANNED_LEG',
      assessment: 'ADVISORY_COMPLETE',
      regulatoryBasis: 'CASR_135_637',
      availableBlockFuelLitre: 400,
      taxiFuelLitre: 15,
      tripFuelLitre: 180,
      contingencyFuelLitre: 15,
      alternateFuelLitre: 45,
      finalReserveFuelLitre: 90,
      requiredBlockFuelLitre: 345,
      operationalMarginLitre: 55,
      operationalMarginMinutes: 18
    });
    expect(estimate.calculationSources.fuelQuantitySource).toContain('fuelOnBoardBeforeUplift');

    sqlite.close();
  });

  it('does not treat uplift-only fuel requests as confirmed available block fuel', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flight = createReadinessDraft(services);
    const detail = services.flightOperations.createFuel(
      {
        flightId: flight.id,
        fuelSupplierId: 'fuel-pertamina-djj',
        fuelType: 'AVTUR',
        requestedQuantityLitre: 220,
        referencePricePerLitre: null
      },
      occActor
    );

    const estimate = detail.fuelPlanningEstimate;

    expect(estimate.availableBlockFuelLitre).toBe(220);
    expect(estimate.calculationSources.fuelQuantitySource).toBe('requestedQuantityLitre');
    expect(estimate.warnings).toContain('FUEL_QUANTITY_IS_UPLIFT_ONLY');

    sqlite.close();
  });

  it('uses published usable capacity without applying expansion-space deduction', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flight = createReadinessDraft(services);
    services.flightOperations.createFuel(
      {
        flightId: flight.id,
        fuelSupplierId: 'fuel-pertamina-djj',
        fuelType: 'AVTUR',
        requestedQuantityLitre: 800,
        confirmedBlockFuelLitre: 800,
        referencePricePerLitre: null
      },
      occActor
    );

    const estimate = services.flightOperations.detail(flight.id).fuelPlanningEstimate;

    expect(estimate.usableFuelCapacityLitre).toBe(646);
    expect(estimate.assessmentBlockFuelLitre).toBe(646);
    expect(estimate.warnings).toContain('AVAILABLE_BLOCK_FUEL_EXCEEDS_USABLE_CAPACITY');

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

  it('keeps the aircraft-unserviceable scenario focused on maintenance action', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const blocked = services.flightOperations.detail('fop-blocked-crew-expired');
    const crewGate = blocked.readinessChecks.find(
      (check) => check.checkCode === 'CREW_LICENSE_MEDICAL'
    );

    expect(blocked.currentStatus).toBe('BLOCKED');
    expect(crewGate?.status).toBe('PASS');
    expect(blocked.blockingReason).toContain('unserviceable');

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

  it('blocks readiness when an assigned crew member lacks the aircraft fleet qualification', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite
      .prepare(
        `DELETE FROM personnel_qualifications
         WHERE personnel_id = 'crew-cop-valid-2'
           AND qualification_type = 'AIRCRAFT_TYPE'
           AND reference_id = 'PC6'`
      )
      .run();

    const evaluated = services.flightOperations.evaluate('fop-ready-approval', occActor);
    expect(
      evaluated.readinessChecks.find((check) => check.checkCode === 'CREW_QUALIFICATION')
    ).toMatchObject({
      status: 'FAIL',
      effectiveStatus: 'BLOCKED'
    });
    expect(evaluated.blockingReason).toContain('PC6 fleet qualification');

    sqlite.close();
  });

  it('uses authoritative license records instead of the legacy crew expiry columns', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite
      .prepare(
        `UPDATE personnel_licenses SET status = 'SUSPENDED'
         WHERE personnel_id = 'crew-pic-valid' AND is_primary = 1`
      )
      .run();

    const evaluated = services.flightOperations.evaluate('fop-ready-approval', occActor);
    expect(
      evaluated.readinessChecks.find((check) => check.checkCode === 'CREW_LICENSE_MEDICAL')
    ).toMatchObject({ status: 'FAIL', effectiveStatus: 'BLOCKED' });
    expect(evaluated.blockingReason).toContain('active primary licence');

    sqlite.close();
  });

  it('recalculates nonterminal flight readiness after a personnel qualification change', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite
      .prepare(
        `UPDATE personnel_qualifications
         SET status = 'SUSPENDED'
         WHERE personnel_id = 'crew-pic-valid'
           AND qualification_type = 'CRM'`
      )
      .run();

    const affected = services.flightOperations.recalculatePersonnelReadiness(
      'crew-pic-valid',
      'SYSTEM_TEST'
    );
    const detail = services.flightOperations.detail('fop-ready-approval');

    expect(affected).toContain('fop-ready-approval');
    expect(
      detail.readinessChecks.find((check) => check.checkCode === 'CREW_QUALIFICATION')
    ).toMatchObject({ status: 'FAIL', effectiveStatus: 'BLOCKED' });
    expect(detail.currentStatus).toBe('BLOCKED');

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

  it('requires commercial details for direct commercial entry and recalculates after saving them', async () => {
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
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: '2026-08-20T03:00:00.000Z',
        scheduledArrivalAt: '2026-08-20T04:00:00.000Z',
        remarks: 'Direct commercial entry readiness'
      },
      occActor
    );

    expect(
      services.flightOperations
        .evaluate(created.id, occActor)
        .readinessChecks.find((check) => check.checkCode === 'FINANCE_INITIALIZED')
    ).toMatchObject({
      status: 'PENDING',
      resultNote: 'Customer, billing type, or revenue estimate is incomplete.'
    });

    const updated = services.flightOperations.updateCommercialDetails(
      created.id,
      {
        customerId: 'cust-papua-logistics',
        billingType: 'CHARTER',
        estimatedRevenue: 28000000
      },
      occActor
    );
    expect(updated.currentStatus).toBe('BLOCKED');
    expect(
      updated.readinessChecks.find((check) => check.checkCode === 'FINANCE_INITIALIZED')
    ).toMatchObject({ status: 'PASS' });

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
      {
        expectedVersion: 1,
        idempotencyKey: `${fuel.id}:approve:system-ready`,
        approvedQuantityLitre: 700
      },
      adminActor
    );
    services.flightOperations.fuelAction(
      fuel.id,
      'uplift',
      {
        expectedVersion: 2,
        idempotencyKey: `${fuel.id}:uplift:system-ready`,
        actualUpliftLitre: 690,
        actualPricePerLitre: 18500
      },
      adminActor
    );
    const fuelPosted = services.flightOperations.fuelAction(
      fuel.id,
      'post',
      {
        expectedVersion: 3,
        idempotencyKey: `${fuel.id}:post:system-ready`
      },
      adminActor
    );
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
        referenceRate: 2750000,
        creationReason: 'Required origin handling for departure verification.'
      },
      occActor
    );
    const stationService = services.flightOperations.listStationServices({
      flightId: created.id
    })[0];
    expect(stationService).toBeDefined();
    services.flightOperations.confirmStationService(stationService.id, adminActor);

    const submitted = services.flightOperations.submit(created.id, occActor);
    expect(['PENDING_READINESS', 'READY_FOR_OCC_REVIEW']).toContain(submitted.currentStatus);

    const evaluated = services.flightOperations.evaluate(created.id, occActor);
    expect(evaluated.currentStatus).toBe('READY_FOR_OCC_REVIEW');
    expect(
      evaluated.readinessChecks.find((check) => check.checkCode === 'PLANNING_DOCUMENTS')
    ).toMatchObject({ effectiveStatus: 'PASSED' });
    const accepted = services.flightOperations.acceptReadiness(
      created.id,
      {
        expectedVersion: evaluated.version,
        readinessRevision: evaluated.readinessRevision,
        note: 'Independent OCC readiness review complete.'
      },
      occCheckerActor
    );
    expect(accepted.currentStatus).toBe('READY_FOR_APPROVAL');
    expect(
      services.flightOperations.approve(
        created.id,
        {
          expectedVersion: accepted.version,
          readinessRevision: accepted.readinessRevision,
          note: 'Director final approval granted.'
        },
        adminActor
      ).currentStatus
    ).toBe('APPROVED');

    sqlite
      .prepare(
        `INSERT INTO operational_advisories (
           id, advisory_type, severity, route_id, station_id, status, valid_from, valid_until,
           summary, operational_limitation, source_reference, created_at, updated_at
         ) VALUES (?, 'RUNWAY', 'BLOCKING', ?, NULL, 'RESOLVED', ?, ?,
           'Runway condition requires confirmation', 'Dispatch prohibited.', 'TEST-NOTAM', ?, ?)`
      )
      .run(
        'advisory-readiness-invalidation',
        created.routeId,
        '2026-07-08T00:00:00.000Z',
        '2026-07-10T23:59:59.000Z',
        '2026-07-13T00:00:00.000Z',
        '2026-07-13T00:00:00.000Z'
      );
    const advisoryResult = services.flightOperations.setOperationalAdvisoryStatus(
      'advisory-readiness-invalidation',
      'ACTIVE',
      'Runway report became unavailable.',
      occActor
    );
    const invalidated = services.flightOperations.detail(created.id);
    expect(advisoryResult.affectedFlightIds).toContain(created.id);
    expect(
      invalidated.readinessChecks.find((check) => check.checkCode === 'OPERATIONAL_ADVISORY')
    ).toMatchObject({ status: 'FAIL', effectiveStatus: 'BLOCKED' });
    expect(invalidated.currentStatus).toBe('REAPPROVAL_REQUIRED');
    expect(invalidated.readinessRevision).toBeGreaterThan(accepted.readinessRevision);
    expect(
      invalidated.approvals.filter((approval) =>
        ['READINESS_APPROVAL', 'FLIGHT_APPROVAL'].includes(approval.approvalType)
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'INVALIDATED',
          invalidationReason: expect.stringContaining('Runway condition')
        })
      ])
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
    const retry = services.flightOperations.decideRequest(
      request.id,
      { decision: 'APPROVE', reason: 'Safe retry after response loss.' },
      'USR-ADMIN'
    );
    expect(retry.flight?.id).toBe(result.flight.id);
    expect(
      (
        sqlite
          .prepare('SELECT COUNT(*) AS count FROM flight_operations WHERE flight_request_id = ?')
          .get(request.id) as { count: number }
      ).count
    ).toBe(1);

    sqlite.close();
  });

  it('enforces the fuel lifecycle, optimistic version, and deterministic retry', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const fuelId = 'fop-dg-pending-fuel';

    expect(() =>
      services.flightOperations.fuelAction(
        fuelId,
        'post',
        {
          expectedVersion: 1,
          idempotencyKey: `${fuelId}:post:invalid`
        },
        'USR-STATION-ADMIN-ORIGIN'
      )
    ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));

    const approveCommand = {
      expectedVersion: 1,
      idempotencyKey: `${fuelId}:approve:deterministic`,
      approvedQuantityLitre: 850
    };
    services.flightOperations.fuelAction(
      fuelId,
      'approve',
      approveCommand,
      'USR-STATION-ADMIN-ORIGIN'
    );
    services.flightOperations.fuelAction(
      fuelId,
      'approve',
      approveCommand,
      'USR-STATION-ADMIN-ORIGIN'
    );

    expect(
      sqlite
        .prepare(
          `SELECT status.code AS status, fuel.version
           FROM flight_fuel_requests fuel
           JOIN fuel_workflow_statuses status ON status.id = fuel.status_id
           WHERE fuel.id = ?`
        )
        .get(fuelId)
    ).toEqual({ status: 'APPROVED', version: 2 });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM flight_fuel_action_commands
           WHERE fuel_request_id = ? AND action = 'approve'`
        )
        .get(fuelId)
    ).toEqual({ count: 1 });

    services.flightOperations.fuelAction(
      fuelId,
      'uplift',
      {
        expectedVersion: 2,
        idempotencyKey: `${fuelId}:uplift:deterministic`,
        actualUpliftLitre: 840,
        actualPricePerLitre: 18_750,
        varianceNote: 'Ten litres below the approved quantity.'
      },
      'USR-STATION-ADMIN-ORIGIN'
    );
    services.flightOperations.fuelAction(
      fuelId,
      'post',
      {
        expectedVersion: 3,
        idempotencyKey: `${fuelId}:post:deterministic`
      },
      'USR-STATION-ADMIN-ORIGIN'
    );

    expect(() =>
      services.flightOperations.fuelAction(
        fuelId,
        'approve',
        {
          expectedVersion: 4,
          idempotencyKey: `${fuelId}:approve:terminal`,
          approvedQuantityLitre: 850
        },
        'USR-STATION-ADMIN-ORIGIN'
      )
    ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));

    sqlite.close();
  });

  it('rejects a fuel supplier outside the flight origin station', async () => {
    const { services, sqlite } = await createSeededTestServices();

    expect(() =>
      services.flightOperations.createFuel(
        {
          flightId: 'fop-dg-pending',
          fuelSupplierId: 'fuel-pertamina-wmx',
          fuelType: 'AVTUR',
          requestedQuantityLitre: 500,
          fuelOnBoardBeforeUpliftLitre: null,
          defuelQuantityLitre: null,
          measuredFuelOnBoardLitre: null,
          confirmedBlockFuelLitre: null,
          referencePricePerLitre: null
        },
        'USR-STATION-ADMIN-ORIGIN'
      )
    ).toThrowError(expect.objectContaining({ code: 'FUEL_SUPPLIER_STATION_MISMATCH' }));

    sqlite.close();
  });

  it('converts explicit origin parking and exposes destination supplier recovery', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const request = services.flightOperations.createRequest(
      {
        flightDate: '2026-08-10',
        flightTypeId: 'flight-type-charter',
        serviceTypeId: 'flight-service-type-charter-passenger',
        routeId: 'route-djj-wmx',
        customerId: 'cust-government',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: '2026-08-10T08:00:00.000+09:00',
        scheduledArrivalAt: '2026-08-10T08:55:00.000+09:00',
        requestSource: 'Regression test',
        priorityId: 'flight-priority-normal',
        passengerEstimate: 4,
        cargoWeightEstimateKg: 50,
        cargoCategory: 'Personal baggage',
        dangerousGoods: false,
        fuelType: 'AVTUR',
        requestedFuelLitre: 600,
        fuelSupplierId: 'fuel-pertamina-djj',
        handlingSupplierId: 'hp-angkasa-djj',
        parkingRequired: true,
        destinationHandlingRequired: true,
        billingType: 'CHARTER',
        estimatedRevenue: 25_000_000,
        remarks: 'Station planning conversion regression'
      },
      occActor
    );
    services.flightOperations.submitRequest(request.id);
    const converted = services.flightOperations.decideRequest(
      request.id,
      { decision: 'APPROVE', reason: 'Planning is complete.' },
      'USR-DIRECTOR'
    ).flight;
    if (!converted) throw new Error('Expected converted Flight Order');

    expect(
      services.flightOperations
        .listStationServices({ flightId: converted.id })
        .filter((service) => service.stationCode === 'DJJ')
        .map((service) => service.serviceType)
    ).toEqual(expect.arrayContaining(['HANDLING', 'PARKING']));

    const detail = services.flightOperations.detailForActor(converted.id, {
      userId: occActor,
      role: 'OCC',
      stationCodes: ['ALL']
    });
    expect(detail.commandCenter?.activeBlockers).toContainEqual(
      expect.objectContaining({
        code: 'STATION_SERVICE_SUPPLIER_REQUIRED',
        ownerStationCode: 'WMX',
        message: expect.stringContaining('destination handling')
      })
    );

    sqlite.close();
  });

  it('applies a destination change selectively and preserves origin service records', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flightId = 'fop-ticketing-passenger-later';
    const before = services.flightOperations.detail(flightId);
    const originBefore = before.stationServices.filter(
      (service) => service.stationId === before.originStationId
    );
    const originCostBefore = before.stationCosts.find(
      (cost) => cost.stationId === before.originStationId
    );
    const command = {
      routeId: 'route-djj-tim',
      destinationHandlingSupplierId: 'hp-angkasa-tim',
      expectedVersion: before.version,
      idempotencyKey: `${flightId}:route:djj-tim`
    };

    const changed = services.flightOperations.changeRouteAssignment(flightId, command, {
      userId: occActor,
      role: 'OCC',
      stationCodes: ['ALL']
    });

    expect(changed).toMatchObject({
      destinationStationCode: 'TIM',
      currentStatus: 'REAPPROVAL_REQUIRED'
    });
    expect(
      changed.stationServices
        .filter((service) => service.stationId === before.originStationId)
        .map((service) => ({ id: service.id, status: service.status }))
    ).toEqual(originBefore.map((service) => ({ id: service.id, status: service.status })));
    expect(changed.stationServices).toContainEqual(
      expect.objectContaining({
        stationCode: 'WMX',
        status: 'CANCELLED'
      })
    );
    expect(changed.stationServices).toContainEqual(
      expect.objectContaining({
        stationCode: 'TIM',
        serviceType: 'HANDLING',
        status: 'PLANNED'
      })
    );
    expect(changed.stationCosts).toContainEqual(
      expect.objectContaining({
        id: originCostBefore?.id,
        status: originCostBefore?.status
      })
    );
    expect(changed.stationCosts).toContainEqual(
      expect.objectContaining({
        stationCode: 'WMX',
        status: 'VOIDED'
      })
    );
    expect(
      services.flightOperations.changeRouteAssignment(flightId, command, {
        userId: occActor,
        role: 'OCC',
        stationCodes: ['ALL']
      }).version
    ).toBe(changed.version);
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM flight_operational_audit
           WHERE flight_id = ? AND action = 'ROUTE_STATION_CHANGED'`
        )
        .get(flightId)
    ).toEqual({ count: 1 });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM flight_action_commands
           WHERE flight_id = ? AND action = ?`
        )
        .get(flightId, 'ROUTE_STATION:route-djj-tim')
    ).toEqual({ count: 1 });

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

  it('does not re-block aircraft location after actual departure', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const created = createReadinessDraft(services);

    sqlite
      .prepare(
        `UPDATE flight_operations
         SET actual_departure_at = '2026-08-20T03:05:00.000Z'
         WHERE id = ?`
      )
      .run(created.id);
    sqlite
      .prepare(`UPDATE aircraft SET current_station_id = 'st-wmx' WHERE id = 'ac-pk-ama'`)
      .run();

    const evaluated = services.flightOperations.evaluate(created.id, occActor);
    const location = evaluated.readinessChecks.find(
      (check) => check.checkCode === 'AIRCRAFT_LOCATION'
    );

    expect(location).toMatchObject({
      status: 'PASS',
      resultNote: 'Aircraft location was validated at departure.'
    });
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
        'verified station service',
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
      (
        sqlite
          .prepare(
            `SELECT COUNT(*) AS count FROM flight_station_tasks
             WHERE flight_id = 'fop-in-progress'
               AND phase LIKE 'DESTINATION_%' AND station_id <> 'st-djj'`
          )
          .get() as { count: number }
      ).count
    ).toBe(0);
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
