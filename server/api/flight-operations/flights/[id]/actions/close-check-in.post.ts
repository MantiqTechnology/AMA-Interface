import {
  flightConcurrencyBodySchema,
  flightOperationIdParamsSchema
} from '#shared/contracts/flight-operations';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.checkin.close');
  const { id } = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, flightConcurrencyBodySchema);
  return getServices().flightOperations.closeCheckIn(id, body, getDemoActorContext(event));
});
