import { currenciesListQuerySchema } from '../../../../shared/features/finance/currencies';
import { getCurrencyService } from '../../../features/finance/currencies';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getCurrencyService().list(parseQuery(event, currenciesListQuerySchema))
);
