import { getDbClient } from '../../../db/client';
import { PaymentTermRepository } from './repository';
import { PaymentTermService } from './service';
export function getPaymentTermService() {
  return new PaymentTermService(new PaymentTermRepository(getDbClient().db));
}
