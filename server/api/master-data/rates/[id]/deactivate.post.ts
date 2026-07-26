import { rateCardsIdParamsSchema } from '../../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'rate.manage');
  const { id } = parseParams(event, rateCardsIdParamsSchema);
  return getRateCardService().deactivate(id, {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event),
    requestId: String(event.context.requestId ?? '')
  });
});
