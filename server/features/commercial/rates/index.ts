import { getDbClient } from '../../../db/client';
import { CurrencyRepository } from '../../finance/currencies/repository';
import { TaxCodeRepository } from '../../finance/tax-codes/repository';
import { StationsRepository } from '../../operations/stations/repository';
import { CustomerRepository } from '../customers/repository';
import { RateCardRepository } from './repository';
import { RateCardService } from './service';
export function getRateCardService() {
  const db = getDbClient().db;
  return new RateCardService(
    new RateCardRepository(db),
    new StationsRepository(db),
    new CustomerRepository(db),
    new CurrencyRepository(db),
    new TaxCodeRepository(db)
  );
}
