import { getDbClient } from '../../../db/client';
import { CurrencyRepository } from '../../finance/currencies/repository';
import { TaxCodeRepository } from '../../finance/tax-codes/repository';
import { StationsRepository } from '../../operations/stations/repository';
import { AgentRepository } from '../agents/repository';
import { CustomerRepository } from '../customers/repository';
import { RateCardRepository } from './repository';
import { RateCardService } from './service';
export function getRateCardService() {
  const client = getDbClient();
  const db = client.db;
  return new RateCardService(
    new RateCardRepository(db, client.sqlite),
    new StationsRepository(db),
    new CustomerRepository(db, client.sqlite),
    new CurrencyRepository(db),
    new TaxCodeRepository(db),
    new AgentRepository(db, client.sqlite)
  );
}
