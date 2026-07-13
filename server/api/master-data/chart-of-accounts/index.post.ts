import { chartOfAccountsInputSchema } from '../../../../shared/features/finance/chart-of-accounts';
import { getChartOfAccountService } from '../../../features/finance/chart-of-accounts';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getChartOfAccountService().create(await parseBody(event, chartOfAccountsInputSchema))
);
