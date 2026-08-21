import { cashBankQuerySchema } from '../../../../shared/features/finance/reconciliation';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.accounting.read');
  return getServices().bankReconciliation.listBookTransactions(
    parseQuery(event, cashBankQuerySchema).accountId
  );
});
