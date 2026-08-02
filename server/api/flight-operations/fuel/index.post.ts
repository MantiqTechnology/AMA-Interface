import { createFuelRequestBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
import { getDemoActorContext, getDemoActorId, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.fuel.update');
  const body = await parseBody(event, createFuelRequestBodySchema);
  const service = getServices().flightOperations;
  const flight = service.detail(body.flightId);
  service.assertActorStationScope(flight.originStationId, getDemoActorContext(event));
  return service.createFuel(body, getDemoActorId(event));
});
