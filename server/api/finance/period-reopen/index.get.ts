import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.accounting.read');
  const query = getQuery(event);
  const periodCode = typeof query.periodCode === 'string' ? query.periodCode : undefined;
  return getServices().financeClosing.listReopenRequests(periodCode);
});
