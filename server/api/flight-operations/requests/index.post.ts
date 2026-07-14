import { createFlightRequestBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight_request.create');
  const body = await parseBody(event, createFlightRequestBodySchema);
  return getServices().flightOperations.createRequest(body, getDemoActorId(event));
});
