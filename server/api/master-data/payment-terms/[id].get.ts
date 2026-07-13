import { paymentTermsIdParamsSchema } from '../../../../shared/features/finance/payment-terms';
import { getPaymentTermService } from '../../../features/finance/payment-terms';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getPaymentTermService().get(parseParams(event, paymentTermsIdParamsSchema).id)
);
