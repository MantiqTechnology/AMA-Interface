import { currenciesInputSchema } from '../../../../shared/features/finance/currencies';
import { getCurrencyService } from '../../../features/finance/currencies';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getCurrencyService().create(await parseBody(event, currenciesInputSchema))
);
