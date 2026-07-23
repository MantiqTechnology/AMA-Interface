import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';
import {
  overrideStationTaskBodySchema,
  stationTaskIdParamsSchema
} from '#shared/contracts/flight-operations';

export default defineApiEventHandler(async (event) => {
  const { id: taskId } = parseParams(event, stationTaskIdParamsSchema);
  const body = await parseBody(event, overrideStationTaskBodySchema);
  await requireDemoPermission(event, 'readiness.override');

  const services = getServices();
  const result = await services.flightOperations.overrideStationTask(
    {
      taskId,
      expectedVersion: body.expectedVersion,
      reason: body.reason,
      evidenceIds: body.evidenceIds
    },
    getDemoActorContext(event)
  );

  return result;
});
