import {
  financeTransactionIdParamsSchema,
  paymentApprovalBodySchema
} from '../../../../../shared/features/finance/transactions';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.accounting.post');
  const body = await parseBody(event, paymentApprovalBodySchema);
  return getServices().financeTransactions.approvePaymentRequest(
    parseParams(event, financeTransactionIdParamsSchema).id,
    getDemoActorId(event),
    getDemoRole(event),
    body.exchangeRateToIdrMicros
  );
});
