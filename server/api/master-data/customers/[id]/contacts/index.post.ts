import {
  customerContactInputSchema,
  customersIdParamsSchema
} from '../../../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../../utils/auth';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'customer.contact.manage');
  const { id } = parseParams(event, customersIdParamsSchema);
  return await getCustomerService().createContact(
    id,
    await parseBody(event, customerContactInputSchema),
    { actorId: getDemoActorId(event), actorName: getDemoRole(event) }
  );
});
