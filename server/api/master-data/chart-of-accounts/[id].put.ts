import {
  chartOfAccountsIdParamsSchema,
  chartOfAccountsInputSchema
} from '../../../../shared/features/finance/chart-of-accounts';
import { getChartOfAccountService } from '../../../features/finance/chart-of-accounts';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, chartOfAccountsIdParamsSchema);
  return getChartOfAccountService().update(id, await parseBody(event, chartOfAccountsInputSchema));
});
