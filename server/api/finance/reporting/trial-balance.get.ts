import { financeReportingQuerySchema } from '../../../../shared/features/finance/reporting';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.accounting.read');
  return getServices().financeReporting.trialBalance(
    parseQuery(event, financeReportingQuerySchema)
  );
});
