import { financialExportQuerySchema } from '../../../../shared/features/finance/governance';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.accounting.read');
  const query = parseQuery(event, financialExportQuerySchema);
  return getServices().financeGovernance.listExports(query.limit);
});
