import { readMultipartFormData } from 'h3';
import { defineApiEventHandler } from '../../utils/api-response';
import { DomainError } from '../../utils/errors';
import { saveUpload } from '../../utils/upload-storage';
import { getDemoActorId, getDemoStationScope, requireDemoPermission } from '../../utils/auth';
import { recordUploadAudit } from '../../utils/upload-audit';
import { validateOperationalUpload } from '../../utils/upload-validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'document.upload');
  const form = await readMultipartFormData(event);
  const file = form?.find((part) => part.name === 'file' && part.filename);

  if (!file?.data || !file.filename) {
    throw new DomainError('UPLOAD_REQUIRED', 'Upload requires a file field', 422);
  }

  const contentType = validateOperationalUpload(file.data, file.filename);
  const upload = await saveUpload({
    data: file.data,
    originalName: file.filename,
    contentType,
    uploadedBy: getDemoActorId(event),
    status: 'DRAFT',
    stationScopes: [...getDemoStationScope(event)],
    purpose: 'DOCUMENT'
  });
  await recordUploadAudit({
    action: 'CREATE',
    uploadId: upload.id,
    actorId: getDemoActorId(event),
    requestId: String(event.context.requestId ?? '')
  });
  return upload;
});
