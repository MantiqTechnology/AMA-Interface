import { customersListQuerySchema } from '../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'customer.read');
  return getCustomerService().list(parseQuery(event, customersListQuerySchema));
});
