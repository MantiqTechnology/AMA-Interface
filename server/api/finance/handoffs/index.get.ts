import { financeHandoffListQuerySchema } from '../../../../shared/features/finance/handoffs';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.accounting.read');
  return getServices().financeHandoffs.list(parseQuery(event, financeHandoffListQuerySchema));
});
