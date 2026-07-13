import { getDbClient } from '../../../db/client';
import { ChartOfAccountRepository } from '../chart-of-accounts/repository';
import { CostCategoryRepository } from './repository';
import { CostCategoryService } from './service';
export function getCostCategoryService() {
  const db = getDbClient().db;
  return new CostCategoryService(new CostCategoryRepository(db), new ChartOfAccountRepository(db));
}
