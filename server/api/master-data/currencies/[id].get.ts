import { currenciesIdParamsSchema } from '../../../../shared/features/finance/currencies';
import { getCurrencyService } from '../../../features/finance/currencies';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getCurrencyService().get(parseParams(event, currenciesIdParamsSchema).id)
);
