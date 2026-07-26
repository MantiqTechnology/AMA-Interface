import { getDbClient } from '../../../db/client';
import { CurrencyRepository } from '../../finance/currencies/repository';
import { StationsRepository } from '../../operations/stations/repository';
import { CustomerRepository } from '../customers/repository';
import { AgentRepository } from './repository';
import { AgentService } from './service';
export function getAgentService() {
  const client = getDbClient();
  const db = client.db;
  return new AgentService(
    new AgentRepository(db, client.sqlite),
    new StationsRepository(db),
    new CustomerRepository(db, client.sqlite),
    new CurrencyRepository(db)
  );
}
