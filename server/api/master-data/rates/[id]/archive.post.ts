import { rateCardsIdParamsSchema } from '../../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'rate.archive');
  const { id } = parseParams(event, rateCardsIdParamsSchema);
  return getRateCardService().archive(id, {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event),
    requestId: String(event.context.requestId ?? '')
  });
});
