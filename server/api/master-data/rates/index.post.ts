import { rateCardsInputSchema } from '../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getRateCardService().create(await parseBody(event, rateCardsInputSchema))
);
