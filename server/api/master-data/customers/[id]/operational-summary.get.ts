import { customersIdParamsSchema } from '../../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'customer.activity.read');
  const { id } = parseParams(event, customersIdParamsSchema);
  return await getCustomerService().getOperationalSummary(id);
});
