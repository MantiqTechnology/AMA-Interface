import {
  currenciesIdParamsSchema,
  currenciesStatusSchema
} from '../../../../../shared/features/finance/currencies';
import { getCurrencyService } from '../../../../features/finance/currencies';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, currenciesIdParamsSchema);
  const { isActive } = await parseBody(event, currenciesStatusSchema);
  return getCurrencyService().setActive(id, isActive);
});
