import {
  paymentTermsIdParamsSchema,
  paymentTermsStatusSchema
} from '../../../../../shared/features/finance/payment-terms';
import { getPaymentTermService } from '../../../../features/finance/payment-terms';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, paymentTermsIdParamsSchema);
  const { isActive } = await parseBody(event, paymentTermsStatusSchema);
  return getPaymentTermService().setActive(id, isActive);
});
