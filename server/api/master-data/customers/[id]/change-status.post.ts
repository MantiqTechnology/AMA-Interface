import {
  customerChangeStatusSchema,
  customersIdParamsSchema
} from '../../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'customer.manage');
  const { id } = parseParams(event, customersIdParamsSchema);
  return await getCustomerService().changeStatus(
    id,
    await parseBody(event, customerChangeStatusSchema),
    { actorId: getDemoActorId(event), actorName: getDemoRole(event) }
  );
});
