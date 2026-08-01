import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';
import { getLocalUpload } from '#server/utils/local-upload-storage';
import {
  addStationTaskEvidenceBodySchema,
  stationTaskIdParamsSchema
} from '#shared/contracts/flight-operations';

export default defineApiEventHandler(async (event) => {
  const { id: taskId } = parseParams(event, stationTaskIdParamsSchema);
  const body = await parseBody(event, addStationTaskEvidenceBodySchema);
  await requireDemoPermission(event, 'station.evidence.add');
  if (body.uploadId) {
    await getLocalUpload(body.uploadId);
  }

  const services = getServices();
  const evidence = await services.flightOperations.addStationTaskEvidence(
    {
      ...body,
      stationTaskId: taskId
    },
    getDemoActorContext(event)
  );

  return evidence;
});
