import { paymentTermsInputSchema } from '../../../../shared/features/finance/payment-terms';
import { getPaymentTermService } from '../../../features/finance/payment-terms';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getPaymentTermService().create(await parseBody(event, paymentTermsInputSchema))
);
