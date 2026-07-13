import { getChartOfAccountService } from '../../../features/finance/chart-of-accounts';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getChartOfAccountService().options());
