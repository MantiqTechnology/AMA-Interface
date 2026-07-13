import { getCurrencyService } from '../../../features/finance/currencies';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getCurrencyService().options());
