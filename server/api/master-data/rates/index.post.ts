import { rateCardsInputSchema } from '../../../../shared/features/commercial/rates';
import { getRateCardService } from '../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'rate.manage');
  return getRateCardService().create(await parseBody(event, rateCardsInputSchema), {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event),
    requestId: String(event.context.requestId ?? '')
  });
});
