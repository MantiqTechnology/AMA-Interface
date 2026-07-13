import { customersInputSchema } from '../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getCustomerService().create(await parseBody(event, customersInputSchema))
);
