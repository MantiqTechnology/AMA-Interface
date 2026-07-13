import { getDbClient } from '../../../db/client';
import { ChartOfAccountRepository } from './repository';
import { ChartOfAccountService } from './service';
export function getChartOfAccountService() {
  return new ChartOfAccountService(new ChartOfAccountRepository(getDbClient().db));
}
