import {
  customersIdParamsSchema,
  customersStatusSchema
} from '../../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'customer.manage');
  const { id } = parseParams(event, customersIdParamsSchema);
  const { isActive } = await parseBody(event, customersStatusSchema);
  return getCustomerService().setActive(id, isActive, {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event)
  });
});
