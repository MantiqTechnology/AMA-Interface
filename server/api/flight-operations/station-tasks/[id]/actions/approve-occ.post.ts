import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';
import {
  approveStationTaskBodySchema,
  stationTaskIdParamsSchema
} from '#shared/contracts/flight-operations';

export default defineApiEventHandler(async (event) => {
  const { id: taskId } = parseParams(event, stationTaskIdParamsSchema);
  const body = await parseBody(event, approveStationTaskBodySchema);
  await requireDemoPermission(event, 'station.signoff.approve');

  const services = getServices();
  const result = await services.flightOperations.approveStationTask(
    {
      taskId,
      decision: body.decision,
      stage: 'OCC',
      expectedVersion: body.expectedVersion,
      reason: body.reason
    },
    getDemoActorContext(event)
  );

  return result;
});
