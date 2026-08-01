import { rateCardsIdParamsSchema } from '../../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'rate.history.read');
  return getRateCardService().listHistory(parseParams(event, rateCardsIdParamsSchema).id);
});
