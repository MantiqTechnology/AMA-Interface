import { accountingListQuerySchema } from '../../../../shared/features/finance/accounting';
import { getServices } from '../../../utils/services';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.accounting.read');
  return getServices().accounting.listAssets(parseQuery(event, accountingListQuerySchema));
});
