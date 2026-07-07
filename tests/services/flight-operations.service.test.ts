import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

describe('FlightOperationsService', () => {
  it('lists seeded operational flight scenarios', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const overview = services.flightOperations.list({
      search: 'AMA-20260707',
      limit: 20,
      offset: 0
    });

    expect(overview.flights.length).toBeGreaterThanOrEqual(5);
    expect(overview.summary.CLOSED).toBeGreaterThanOrEqual(1);
    expect(overview.summary.BLOCKED).toBeGreaterThanOrEqual(1);

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

    const created = services.flightOperations.create({
      flightDate: '2026-07-09',
      flightType: 'CHARTER',
      routeId: 'ref-route-djj-wmx',
      customerId: 'ref-cust-papua-logistics',
      aircraftId: 'ref-ac-pk-ama',
      pilotInCommandId: 'ref-crew-pic-valid',
      coPilotId: 'ref-crew-cop-valid',
      scheduledDepartureAt: '2026-07-09T01:00:00.000Z',
      scheduledArrivalAt: '2026-07-09T02:05:00.000Z',
      remarks: 'Automated service test'
    });

    sqlite
      .prepare(
        `UPDATE flight_manifests SET status = 'APPROVED', updated_at = ? WHERE flight_id = ?`
      )
      .run(new Date().toISOString(), created.id);

    services.flightOperations.createFuel({
      flightId: created.id,
      fuelSupplierId: 'ref-fuel-pertamina-djj',
      fuelType: 'AVTUR',
      requestedQuantityLitre: 700,
      referencePricePerLitre: 18500
    });
    const fuel = services.flightOperations.listFuel({ flightId: created.id })[0];
    expect(fuel).toBeDefined();
    services.flightOperations.fuelAction(fuel.id, 'approve', { approvedQuantityLitre: 700 });
    services.flightOperations.fuelAction(fuel.id, 'uplift', {
      actualUpliftLitre: 690,
      actualPricePerLitre: 18500
    });

    services.flightOperations.createStationService({
      flightId: created.id,
      stationId: 'ref-st-djj',
      serviceSupplierId: 'ref-hp-angkasa-djj',
      serviceType: 'HANDLING',
      referenceRate: 2750000
    });
    const stationService = services.flightOperations.listStationServices({
      flightId: created.id
    })[0];
    expect(stationService).toBeDefined();
    services.flightOperations.confirmStationService(stationService.id);

    const submitted = services.flightOperations.submit(created.id);
    expect(['PENDING_READINESS', 'READY_FOR_APPROVAL']).toContain(submitted.currentStatus);

    const evaluated = services.flightOperations.evaluate(created.id);
    expect(evaluated.currentStatus).toBe('READY_FOR_APPROVAL');
    expect(
      evaluated.readinessChecks.every((check) => ['PASS', 'NOT_APPLICABLE'].includes(check.status))
    ).toBe(true);

    const approved = services.flightOperations.approve(created.id);
    expect(approved.currentStatus).toBe('APPROVED');
    expect(approved.approvedByUserId).toBe('USR-DEMO-ADMIN');

    sqlite.close();
  });
});
