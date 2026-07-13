import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RateCardInput } from '../../shared/features/commercial/rates';
import type { createDbClient } from '../../server/db/client';
import { CustomerRepository } from '../../server/features/commercial/customers/repository';
import { RateCardRepository } from '../../server/features/commercial/rates/repository';
import { RateCardService } from '../../server/features/commercial/rates/service';
import { CurrencyRepository } from '../../server/features/finance/currencies/repository';
import { TaxCodeRepository } from '../../server/features/finance/tax-codes/repository';
import { StationsRepository } from '../../server/features/operations/stations/repository';
import { createSeededMasterDataDb } from '../helpers/master-data-db';

const validRate: RateCardInput = {
  rateCode: 'SERVICE-TEST-RATE',
  serviceType: 'CHARTER',
  originStationId: 'st-oks',
  destinationStationId: 'st-mkq',
  customerId: null,
  aircraftType: null,
  currencyId: 'cur-idr',
  taxCodeId: 'tax-ppn-demo',
  baseRate: 1_000_000,
  rateUnit: 'PER_FLIGHT',
  pricingScope: 'PUBLIC_COUNTER',
  bookingChannel: 'COUNTER',
  passengerType: null,
  cargoPriceBasis: null,
  ratePriority: 100,
  minimumCharge: null,
  demoUsageNote: null,
  effectiveFrom: '2026-07-13',
  effectiveTo: null
};

describe('commercial master data services', () => {
  let client: ReturnType<typeof createDbClient>;
  let rates: RateCardService;

  beforeEach(async () => {
    client = await createSeededMasterDataDb();
    rates = new RateCardService(
      new RateCardRepository(client.db),
      new StationsRepository(client.db),
      new CustomerRepository(client.db),
      new CurrencyRepository(client.db),
      new TaxCodeRepository(client.db)
    );
  });

  afterEach(() => client.sqlite.close());

  it('owns rate CRUD state, search, duplicates, and service-specific units', async () => {
    const created = await rates.create(validRate);
    expect(await rates.list({ active: 'active', search: 'SERVICE-TEST' })).toHaveLength(1);

    await rates.setActive(created.id, false);
    expect(await rates.list({ active: 'inactive', search: 'SERVICE-TEST' })).toHaveLength(1);

    await expect(rates.create(validRate)).rejects.toMatchObject({ code: 'RATE_CARDS_DUPLICATE' });
    await expect(
      rates.create({
        ...validRate,
        rateCode: 'INVALID-PASSENGER-RATE',
        serviceType: 'PASSENGER',
        rateUnit: 'PER_FLIGHT'
      })
    ).rejects.toMatchObject({ code: 'RATE_PASSENGER_UNIT_INVALID' });
    await expect(
      rates.create({
        ...validRate,
        rateCode: 'INVALID-CARGO-RATE',
        serviceType: 'CARGO',
        rateUnit: 'PER_KG',
        cargoPriceBasis: null
      })
    ).rejects.toMatchObject({ code: 'RATE_CARGO_BASIS_REQUIRED' });
  });
});
