import { createFlightRequestBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const body = await parseBody(event, createFlightRequestBodySchema);
  return getServices().flightOperations.createRequest(body, getDemoActorId(event));
});
