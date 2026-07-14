import {
  flightOperationIdParamsSchema,
  flightReasonActionBodySchema
} from '../../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseBody, parseParams } from '../../../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.following.update');
  const params = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, flightReasonActionBodySchema);
  return getServices().flightOperations.cancel(params.id, body, getDemoActorId(event));
});
