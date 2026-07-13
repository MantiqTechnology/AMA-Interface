import { getDbClient } from '../../../db/client';
import { PaymentTermRepository } from '../../finance/payment-terms/repository';
import { CustomerRepository } from './repository';
import { CustomerService } from './service';
export function getCustomerService() {
  const db = getDbClient().db;
  return new CustomerService(new CustomerRepository(db), new PaymentTermRepository(db));
}
