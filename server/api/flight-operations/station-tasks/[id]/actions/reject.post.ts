import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';
import {
  rejectStationTaskBodySchema,
  stationTaskIdParamsSchema
} from '#shared/contracts/flight-operations';

export default defineApiEventHandler(async (event) => {
  const { id: taskId } = parseParams(event, stationTaskIdParamsSchema);
  const body = await parseBody(event, rejectStationTaskBodySchema);
  await requireDemoPermission(event, 'station.task.reject');

  const services = getServices();
  const result = await services.flightOperations.rejectStationTask(
    {
      taskId,
      rejectionReason: body.rejectionReason,
      expectedVersion: body.expectedVersion
    },
    getDemoActorContext(event)
  );

  return result;
});
