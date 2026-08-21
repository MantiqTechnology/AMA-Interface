import {
  financeTransactionIdParamsSchema,
  receiptAllocationBodySchema
} from '../../../../../shared/features/finance/transactions';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.payment.record');
  const { id } = parseParams(event, financeTransactionIdParamsSchema);
  const body = await parseBody(event, receiptAllocationBodySchema);
  return getServices().financeTransactions.allocateReceipt(
    id,
    body.invoiceId,
    body.amountMinor,
    getDemoActorId(event)
  );
});
