import { paymentTermsListQuerySchema } from '../../../../shared/features/finance/payment-terms';
import { getPaymentTermService } from '../../../features/finance/payment-terms';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getPaymentTermService().list(parseQuery(event, paymentTermsListQuerySchema))
);
