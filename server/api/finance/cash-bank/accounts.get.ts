import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.accounting.read');
  return getServices().bankReconciliation.listCashBankAccounts();
});
