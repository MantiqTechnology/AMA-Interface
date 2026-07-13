import { rateCardsIdParamsSchema } from '../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getRateCardService().get(parseParams(event, rateCardsIdParamsSchema).id)
);
