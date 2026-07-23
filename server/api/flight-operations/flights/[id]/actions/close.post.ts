import { flightOperationIdParamsSchema } from '#shared/contracts/flight-operations';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorId, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.closure.execute');
  const params = parseParams(event, flightOperationIdParamsSchema);
  const services = getServices();
  const result = services.flightOperations.closeFlightWithRequirements(
    params.id,
    getDemoActorId(event)
  );

  return result;
});
