import {
  currenciesIdParamsSchema,
  currenciesInputSchema
} from '../../../../shared/features/finance/currencies';
import { getCurrencyService } from '../../../features/finance/currencies';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, currenciesIdParamsSchema);
  return getCurrencyService().update(id, await parseBody(event, currenciesInputSchema));
});
