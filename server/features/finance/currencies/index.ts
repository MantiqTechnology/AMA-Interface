import { getDbClient } from '../../../db/client';
import { CurrencyRepository } from './repository';
import { CurrencyService } from './service';
export function getCurrencyService() {
  return new CurrencyService(new CurrencyRepository(getDbClient().db));
}
