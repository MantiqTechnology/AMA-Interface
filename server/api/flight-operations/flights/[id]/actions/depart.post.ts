import {
  actualTimeBodySchema,
  flightOperationIdParamsSchema
} from '#shared/contracts/flight-operations';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';
import {
  getDemoActorId,
  requireDemoFlightStationAccess,
  requireDemoPermission
} from '#server/utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.departure.execute');
  const params = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, actualTimeBodySchema);
  const services = getServices();
  const flight = services.flightOperations.detail(params.id);
  requireDemoFlightStationAccess(event, [flight.originStationCode]);

  return services.flightOperations.departWithCriticalRevalidation(
    params.id,
    body,
    getDemoActorId(event)
  );
});
