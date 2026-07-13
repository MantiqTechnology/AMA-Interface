import { rateCardsListQuerySchema } from '../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getRateCardService().list(parseQuery(event, rateCardsListQuerySchema))
);
