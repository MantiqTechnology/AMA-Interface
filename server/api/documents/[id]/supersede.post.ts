import { idParamSchema } from '../../../../shared/contracts/common';
import { supersedeDocumentBodySchema } from '../../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDocument, supersedeDocument } from '../../../utils/local-document-storage';
import { parseBody, parseParams } from '../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { requireDocumentOwnerAccess } from '../../../utils/document-access';
import { invalidateFlightDocumentReadiness } from '../../../utils/flight-document-readiness';
import { getUpload } from '../../../utils/upload-storage';
import { requireUploadAccess } from '../../../utils/upload-access';
import { DomainError } from '../../../utils/errors';
import { recordUploadAudit } from '../../../utils/upload-audit';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'document.upload');
  const { id } = parseParams(event, idParamSchema);
  const document = await getDocument(id);
  requireDocumentOwnerAccess(
    event,
    document.ownerType,
    document.ownerId,
    document.visibility,
    document.documentType
  );
  const body = await parseBody(event, supersedeDocumentBodySchema);
  const upload = await getUpload(body.uploadId);
  await requireUploadAccess(event, upload);
  if (upload.status !== 'DRAFT') {
    throw new DomainError('UPLOAD_ALREADY_ATTACHED', 'Select a new upload draft.', 409);
  }
  const superseded = await supersedeDocument(id, body, getDemoActorId(event));
  await recordUploadAudit({
    action: 'ATTACH',
    uploadId: body.uploadId,
    actorId: getDemoActorId(event),
    requestId: String(event.context.requestId ?? ''),
    ownerType: document.ownerType,
    ownerId: document.ownerId
  });
  invalidateFlightDocumentReadiness(document.ownerType, document.ownerId, getDemoActorId(event));
  return superseded;
});
