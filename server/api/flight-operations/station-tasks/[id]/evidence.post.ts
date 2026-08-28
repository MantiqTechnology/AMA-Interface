import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';
import { getUpload } from '#server/utils/upload-storage';
import { requireUploadAccess } from '#server/utils/upload-access';
import { DomainError } from '#server/utils/errors';
import {
  addStationTaskEvidenceBodySchema,
  stationTaskIdParamsSchema
} from '#shared/contracts/flight-operations';

export default defineApiEventHandler(async (event) => {
  const { id: taskId } = parseParams(event, stationTaskIdParamsSchema);
  const body = await parseBody(event, addStationTaskEvidenceBodySchema);
  await requireDemoPermission(event, 'station.evidence.add');
  if (body.uploadId) {
    const upload = await getUpload(body.uploadId);
    await requireUploadAccess(event, upload);
    if (upload.status !== 'DRAFT') {
      throw new DomainError('UPLOAD_ALREADY_ATTACHED', 'Select a new upload draft.', 409);
    }
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
