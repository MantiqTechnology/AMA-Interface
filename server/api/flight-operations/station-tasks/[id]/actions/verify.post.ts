import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';
import {
  stationTaskIdParamsSchema,
  verifyStationTaskBodySchema
} from '#shared/contracts/flight-operations';

export default defineApiEventHandler(async (event) => {
  const { id: taskId } = parseParams(event, stationTaskIdParamsSchema);
  const body = await parseBody(event, verifyStationTaskBodySchema);
  await requireDemoPermission(event, 'station.task.verify');

  const services = getServices();
  const result = await services.flightOperations.verifyStationTask(
    {
      taskId,
      expectedVersion: body.expectedVersion,
      reason: body.reason
    },
    getDemoActorContext(event)
  );

  return result;
});
