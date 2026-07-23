import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseParams } from '#server/utils/validation';
import { flightOperationIdParamsSchema } from '#shared/contracts/flight-operations';

export default defineApiEventHandler(async (event) => {
  const { id: flightId } = parseParams(event, flightOperationIdParamsSchema);
  await requireDemoPermission(event, 'station.task.view');

  const services = getServices();
  services.flightOperations.assertFlightStationScope(flightId, getDemoActorContext(event));
  const tasks = await services.flightOperations.getFlightStationTasks(
    flightId,
    getDemoActorContext(event)
  );

  return tasks;
});
