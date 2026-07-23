import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';
import {
  startStationTaskBodySchema,
  stationTaskIdParamsSchema
} from '#shared/contracts/flight-operations';

export default defineApiEventHandler(async (event) => {
  const { id: taskId } = parseParams(event, stationTaskIdParamsSchema);
  await requireDemoPermission(event, 'station.task.start');
  const body = await parseBody(event, startStationTaskBodySchema);

  const services = getServices();
  const result = await services.flightOperations.startStationTask(
    taskId,
    body.expectedVersion,
    getDemoActorContext(event)
  );

  return result;
});
