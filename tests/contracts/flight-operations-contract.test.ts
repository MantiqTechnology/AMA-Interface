import { describe, expect, it } from 'vitest';
import {
  addStationTaskEvidenceBodySchema,
  createCargoBodySchema,
  createDirectFlightOperationBodySchema,
  createFlightOperationBodySchema,
  createFlightRequestBodySchema,
  createFuelRequestBodySchema,
  createStationCostBodySchema
} from '../../shared/contracts/flight-operations';

describe('flight operation request contracts', () => {
  it('requires an auditable reason for direct Flight Order creation', () => {
    const base = {
      flightDate: '2026-07-08',
      flightTypeId: 'flight-type-charter',
      serviceTypeId: 'flight-service-type-charter-cargo',
      priorityId: 'flight-priority-normal',
      routeId: 'route-djj-wmx'
    };

    expect(createDirectFlightOperationBodySchema.safeParse(base).success).toBe(false);
    expect(
      createDirectFlightOperationBodySchema.parse({
        ...base,
        directCreationReason: 'Emergency operational recovery flight.'
      }).directCreationReason
    ).toBe('Emergency operational recovery flight.');
  });

  it('normalizes blank optional flight fields and datetime-local values', () => {
    const parsed = createFlightOperationBodySchema.parse({
      flightDate: '2026-07-08',
      flightTypeId: 'flight-type-charter',
      serviceTypeId: 'flight-service-type-charter-cargo',
      priorityId: 'flight-priority-normal',
      routeId: 'route-djj-wmx',
      customerId: '',
      aircraftId: '',
      pilotInCommandId: '',
      coPilotId: '',
      scheduledDepartureAt: '',
      scheduledArrivalAt: '2026-07-08T09:30',
      remarks: ''
    });

    expect(parsed.customerId).toBeNull();
    expect(parsed.aircraftId).toBeNull();
    expect(parsed.pilotInCommandId).toBeNull();
    expect(parsed.coPilotId).toBeNull();
    expect(parsed.scheduledDepartureAt).toBeNull();
    expect(parsed.scheduledArrivalAt).toMatch(/2026-07-08T\d{2}:30:00\.000Z/u);
    expect(parsed.remarks).toBeNull();
  });

  it('coerces form numeric strings and blank nullable fields on related POST bodies', () => {
    const cargo = createCargoBodySchema.parse({
      manifestId: 'manifest-1',
      expectedVersion: 1,
      description: 'Medical cargo',
      senderName: '',
      receiverName: '',
      actualWeightKg: '12.5',
      volumeWeightKg: '',
      chargeableWeightKg: '13',
      dgCategoryId: '',
      dgAcceptanceStatusId: ''
    });

    expect(cargo.senderName).toBeNull();
    expect(cargo.actualWeightKg).toBe(12.5);
    expect(cargo.volumeWeightKg).toBeNull();
    expect(cargo.chargeableWeightKg).toBe(13);
    expect(cargo.dgCategoryId).toBeNull();
    expect(cargo.dgAcceptanceStatusId).toBe('dg-acceptance-status-not-applicable');

    const fuel = createFuelRequestBodySchema.parse({
      flightId: 'flight-1',
      fuelSupplierId: 'supplier-1',
      fuelType: 'AVTUR',
      requestedQuantityLitre: '700',
      fuelOnBoardBeforeUpliftLitre: '180',
      defuelQuantityLitre: '',
      measuredFuelOnBoardLitre: '',
      confirmedBlockFuelLitre: '400',
      referencePricePerLitre: ''
    });

    expect(fuel.requestedQuantityLitre).toBe(700);
    expect(fuel.fuelOnBoardBeforeUpliftLitre).toBe(180);
    expect(fuel.defuelQuantityLitre).toBeNull();
    expect(fuel.measuredFuelOnBoardLitre).toBeNull();
    expect(fuel.confirmedBlockFuelLitre).toBe(400);
    expect(fuel.referencePricePerLitre).toBeNull();

    const stationCost = createStationCostBodySchema.parse({
      flightId: '',
      stationId: 'st-djj',
      vendorId: '',
      costCategoryId: 'cost-handling',
      amount: '250000',
      currencyId: 'currency-idr',
      description: 'Handling'
    });

    expect(stationCost.flightId).toBeNull();
    expect(stationCost.vendorId).toBeNull();
    expect(stationCost.amount).toBe(250000);
  });

  it('accepts PT AMA station evidence received from AVSEC as an external report', () => {
    const evidence = addStationTaskEvidenceBodySchema.parse({
      expectedVersion: '2',
      uploadId: 'upload-1',
      fileName: 'avsec-report.pdf',
      documentType: 'STATION_EXTERNAL_REPORT',
      evidenceCategory: 'EXTERNAL_REPORT',
      sourceParty: 'AVSEC',
      sourcePartyName: 'DJJ AVSEC post',
      receivedAt: '2026-07-23T07:30'
    });

    expect(evidence).toMatchObject({
      expectedVersion: 2,
      evidenceCategory: 'EXTERNAL_REPORT',
      sourceParty: 'AVSEC',
      sourcePartyName: 'DJJ AVSEC post'
    });
  });

  it('normalizes the five-step flight request payload', () => {
    const parsed = createFlightRequestBodySchema.parse({
      flightDate: '2026-07-10',
      flightTypeId: 'flight-type-cargo',
      serviceTypeId: 'flight-service-type-charter-cargo',
      routeId: 'route-djj-wmx',
      customerId: 'cust-papua-logistics',
      aircraftId: 'ac-pk-ama',
      pilotInCommandId: 'crew-pic-valid',
      coPilotId: '',
      scheduledDepartureAt: '2026-07-10T08:30',
      scheduledArrivalAt: '2026-07-10T09:45',
      requestSource: 'Corporate Charter Request',
      priorityId: 'flight-priority-normal',
      passengerEstimate: '2',
      cargoWeightEstimateKg: '640',
      dangerousGoods: false,
      requestedFuelLitre: '850',
      parkingRequired: true,
      destinationHandlingRequired: true,
      estimatedRevenue: '28000000'
    });

    expect(parsed.coPilotId).toBeNull();
    expect(parsed.passengerEstimate).toBe(2);
    expect(parsed.cargoWeightEstimateKg).toBe(640);
    expect(parsed.requestedFuelLitre).toBe(850);
    expect(parsed.estimatedRevenue).toBe(28000000);
  });
});
