import { financeTransactionIdParamsSchema } from '../../../../../shared/features/finance/transactions';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseParams } from '../../../../utils/validation';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.payment.record');
  return getServices().bankReconciliation.autoMatch(
    parseParams(event, financeTransactionIdParamsSchema).id,
    getDemoActorId(event)
  );
});
