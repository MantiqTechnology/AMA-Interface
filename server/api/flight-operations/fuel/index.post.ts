import { createFuelRequestBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.fuel.update');
  const body = await parseBody(event, createFuelRequestBodySchema);
  return getServices().flightOperations.createFuel(body, getDemoActorId(event));
});
