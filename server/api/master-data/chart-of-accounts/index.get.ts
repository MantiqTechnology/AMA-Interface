import { chartOfAccountsListQuerySchema } from '../../../../shared/features/finance/chart-of-accounts';
import { getChartOfAccountService } from '../../../features/finance/chart-of-accounts';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getChartOfAccountService().list(parseQuery(event, chartOfAccountsListQuerySchema))
);
