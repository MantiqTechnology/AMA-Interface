import { customersInputSchema } from '../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'customer.manage');
  return getCustomerService().create(await parseBody(event, customersInputSchema), {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event)
  });
});
