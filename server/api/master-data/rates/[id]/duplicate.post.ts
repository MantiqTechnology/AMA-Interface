import {
  duplicateRateCardSchema,
  rateCardsIdParamsSchema
} from '../../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'rate.duplicate');
  const { id } = parseParams(event, rateCardsIdParamsSchema);
  return getRateCardService().duplicate(id, await parseBody(event, duplicateRateCardSchema), {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event),
    requestId: String(event.context.requestId ?? '')
  });
});
