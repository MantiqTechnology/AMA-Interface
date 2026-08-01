import {
  rateCardsIdParamsSchema,
  ratePreviewRequestSchema
} from '../../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'rate.preview');
  const { id } = parseParams(event, rateCardsIdParamsSchema);
  return getRateCardService().preview(id, await parseBody(event, ratePreviewRequestSchema));
});
