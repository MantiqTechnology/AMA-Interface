import { customersListQuerySchema } from '../../../../shared/features/commercial/customers';
import { getCustomerService } from '../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getCustomerService().list(parseQuery(event, customersListQuerySchema))
);
