import {
  customersIdParamsSchema,
  customersInputSchema
} from '../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, customersIdParamsSchema);
  return getCustomerService().update(id, await parseBody(event, customersInputSchema));
});
