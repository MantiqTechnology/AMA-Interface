import { getDbClient } from '../../../db/client';
import { TaxCodeRepository } from './repository';
import { TaxCodeService } from './service';
export function getTaxCodeService() {
  return new TaxCodeService(new TaxCodeRepository(getDbClient().db));
}
