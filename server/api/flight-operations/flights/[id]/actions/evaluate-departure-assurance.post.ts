import { flightOperationIdParamsSchema } from '#shared/contracts/flight-operations';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseParams } from '#server/utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'flight.departure.assurance.evaluate');
  const { id } = parseParams(event, flightOperationIdParamsSchema);
  return getServices().flightOperations.evaluateDepartureAssurance(id, getDemoActorContext(event));
});
