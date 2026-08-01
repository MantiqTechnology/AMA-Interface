import { customersIdParamsSchema } from '../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { hasDemoPermission, requireDemoPermission } from '../../../utils/auth';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'customer.read');
  return getCustomerService().getDetail(
    parseParams(event, customersIdParamsSchema).id,
    hasDemoPermission(event, 'customer.financial.read')
  );
});
