import { describe, expect, it } from 'vitest';
import {
  createCargoBodySchema,
  createFlightOperationBodySchema,
  createFuelRequestBodySchema,
  createStationCostBodySchema
} from '../../shared/contracts/flight-operations';

describe('flight operation request contracts', () => {
  it('normalizes blank optional flight fields and datetime-local values', () => {
    const parsed = createFlightOperationBodySchema.parse({
      flightDate: '2026-07-08',
      flightType: 'CHARTER',
      routeId: 'ref-route-djj-wmx',
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
      description: 'Medical cargo',
      senderName: '',
      receiverName: '',
      actualWeightKg: '12.5',
      volumeWeightKg: '',
      chargeableWeightKg: '13',
      dgCategoryId: '',
      dgAcceptanceStatus: ''
    });

    expect(cargo.senderName).toBeNull();
    expect(cargo.actualWeightKg).toBe(12.5);
    expect(cargo.volumeWeightKg).toBeNull();
    expect(cargo.chargeableWeightKg).toBe(13);
    expect(cargo.dgCategoryId).toBeNull();
    expect(cargo.dgAcceptanceStatus).toBe('NOT_APPLICABLE');

    const fuel = createFuelRequestBodySchema.parse({
      flightId: 'flight-1',
      fuelSupplierId: 'supplier-1',
      fuelType: 'AVTUR',
      requestedQuantityLitre: '700',
      referencePricePerLitre: ''
    });

    expect(fuel.requestedQuantityLitre).toBe(700);
    expect(fuel.referencePricePerLitre).toBeNull();

    const stationCost = createStationCostBodySchema.parse({
      flightId: '',
      stationId: 'ref-st-djj',
      vendorId: '',
      costCategoryId: 'ref-cost-handling',
      amount: '250000',
      currencyId: 'ref-currency-idr',
      description: 'Handling'
    });

    expect(stationCost.flightId).toBeNull();
    expect(stationCost.vendorId).toBeNull();
    expect(stationCost.amount).toBe(250000);
  });
});
