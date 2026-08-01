import {
  rateCardsIdParamsSchema,
  rateCardsInputSchema
} from '../../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'rate.manage');
  const { id } = parseParams(event, rateCardsIdParamsSchema);
  return getRateCardService().createVersion(id, await parseBody(event, rateCardsInputSchema), {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event),
    requestId: String(event.context.requestId ?? '')
  });
});
