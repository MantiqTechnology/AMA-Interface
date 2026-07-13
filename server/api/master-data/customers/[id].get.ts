import { customersIdParamsSchema } from '../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getCustomerService().get(parseParams(event, customersIdParamsSchema).id)
);
