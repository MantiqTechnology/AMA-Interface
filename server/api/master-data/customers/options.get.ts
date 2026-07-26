import { getCustomerService } from '../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'customer.read');
  return getCustomerService().options();
});
