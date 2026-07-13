import { getCustomerService } from '../../../features/commercial/customers';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getCustomerService().options());
