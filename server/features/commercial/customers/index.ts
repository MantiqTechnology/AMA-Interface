import { getDbClient } from '../../../db/client';
import { PaymentTermRepository } from '../../finance/payment-terms/repository';
import { CustomerRepository } from './repository';
import { CustomerService } from './service';
export function getCustomerService() {
  const client = getDbClient();
  return new CustomerService(
    new CustomerRepository(client.db, client.sqlite),
    new PaymentTermRepository(client.db)
  );
}
