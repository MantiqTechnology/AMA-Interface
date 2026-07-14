import { flightOperationIdParamsSchema } from '../../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseParams } from '../../../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'flight.following.update');
  const params = parseParams(event, flightOperationIdParamsSchema);
  return getServices().flightOperations.transition(
    params.id,
    'PENDING_CLOSURE',
    getDemoActorId(event)
  );
});
