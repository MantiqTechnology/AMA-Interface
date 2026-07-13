import { getPaymentTermService } from '../../../features/finance/payment-terms';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getPaymentTermService().options());
