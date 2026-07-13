import {
  customersIdParamsSchema,
  customersStatusSchema
} from '../../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, customersIdParamsSchema);
  const { isActive } = await parseBody(event, customersStatusSchema);
  return getCustomerService().setActive(id, isActive);
});
