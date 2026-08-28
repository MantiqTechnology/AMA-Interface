import { createDocumentBodySchema } from '../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../utils/api-response';
import { createDocument } from '../../utils/local-document-storage';
import { parseBody } from '../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../utils/auth';
import { requireDocumentOwnerAccess } from '../../utils/document-access';
import { invalidateFlightDocumentReadiness } from '../../utils/flight-document-readiness';
import { getUpload } from '../../utils/upload-storage';
import { requireUploadAccess } from '../../utils/upload-access';
import { DomainError } from '../../utils/errors';
import { recordUploadAudit } from '../../utils/upload-audit';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'document.upload');
  const body = await parseBody(event, createDocumentBodySchema);
  requireDocumentOwnerAccess(
    event,
    body.ownerType,
    body.ownerId,
    body.visibility,
    body.documentType
  );
  const upload = await getUpload(body.uploadId);
  await requireUploadAccess(event, upload);
  if (upload.status !== 'DRAFT') {
    throw new DomainError('UPLOAD_ALREADY_ATTACHED', 'Select a new upload draft.', 409);
  }
  const document = await createDocument(body, getDemoActorId(event));
  await recordUploadAudit({
    action: 'ATTACH',
    uploadId: body.uploadId,
    actorId: getDemoActorId(event),
    requestId: String(event.context.requestId ?? ''),
    ownerType: body.ownerType,
    ownerId: body.ownerId
  });
  invalidateFlightDocumentReadiness(body.ownerType, body.ownerId, getDemoActorId(event));
  return document;
});
