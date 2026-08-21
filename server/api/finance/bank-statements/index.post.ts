import { bankStatementBodySchema } from '../../../../shared/features/finance/reconciliation';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.payment.record');
  return getServices().bankReconciliation.createStatement({
    ...(await parseBody(event, bankStatementBodySchema)),
    importedBy: getDemoActorId(event)
  });
});
