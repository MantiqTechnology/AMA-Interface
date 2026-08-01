import {
  rateCardsIdParamsSchema,
  rateCardsStatusSchema
} from '../../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, rateCardsIdParamsSchema);
  const { isActive } = await parseBody(event, rateCardsStatusSchema);
  requireDemoPermission(event, isActive ? 'rate.activate' : 'rate.manage');
  return getRateCardService().setActive(id, isActive, {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event),
    requestId: String(event.context.requestId ?? '')
  });
});
