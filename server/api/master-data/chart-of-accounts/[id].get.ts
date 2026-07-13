import { chartOfAccountsIdParamsSchema } from '../../../../shared/features/finance/chart-of-accounts';
import { getChartOfAccountService } from '../../../features/finance/chart-of-accounts';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getChartOfAccountService().get(parseParams(event, chartOfAccountsIdParamsSchema).id)
);
