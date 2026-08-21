import { paymentRequestBodySchema } from '../../../../shared/features/finance/transactions';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.payment.record');
  return getServices().financeTransactions.createPaymentRequest({
    ...(await parseBody(event, paymentRequestBodySchema)),
    createdBy: getDemoActorId(event)
  });
});
