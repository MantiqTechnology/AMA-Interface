import {
  rateCardsIdParamsSchema,
  rateCardsInputSchema
} from '../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, rateCardsIdParamsSchema);
  return getRateCardService().update(id, await parseBody(event, rateCardsInputSchema));
});
