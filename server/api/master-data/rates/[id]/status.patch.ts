import {
  rateCardsIdParamsSchema,
  rateCardsStatusSchema
} from '../../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, rateCardsIdParamsSchema);
  const { isActive } = await parseBody(event, rateCardsStatusSchema);
  return getRateCardService().setActive(id, isActive);
});
