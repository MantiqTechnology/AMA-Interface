import { getDbClient } from '../../../db/client';
import { DgCategoryRepository } from './repository';
import { DgCategoryService } from './service';
export function getDgCategoryService() {
  return new DgCategoryService(new DgCategoryRepository(getDbClient().db));
}
