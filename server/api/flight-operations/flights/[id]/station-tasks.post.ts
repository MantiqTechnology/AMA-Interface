import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseParams, parseBody } from '#server/utils/validation';
import {
  createStationTaskBodySchema,
  flightOperationIdParamsSchema
} from '#shared/contracts/flight-operations';

export default defineApiEventHandler(async (event) => {
  const { id: flightId } = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, createStationTaskBodySchema);
  await requireDemoPermission(event, 'station.task.assign');

  const services = getServices();
  services.flightOperations.assertFlightStationScope(flightId, getDemoActorContext(event));
  const task = await services.flightOperations.createStationTask(
    {
      ...body,
      flightId
    },
    getDemoActorContext(event)
  );

  return task;
});
