import { idParamSchema } from '../../../../shared/contracts/common';
import { rejectDocumentBodySchema } from '../../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDocument, rejectDocument } from '../../../utils/local-document-storage';
import { parseBody, parseParams } from '../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { requireDocumentOwnerAccess } from '../../../utils/document-access';
import { invalidateFlightDocumentReadiness } from '../../../utils/flight-document-readiness';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'document.verify');
  const { id } = parseParams(event, idParamSchema);
  const document = await getDocument(id);
  requireDocumentOwnerAccess(event, document.ownerType, document.ownerId);
  const body = await parseBody(event, rejectDocumentBodySchema);
  const rejected = await rejectDocument(id, body.rejectionReason);
  invalidateFlightDocumentReadiness(document.ownerType, document.ownerId, getDemoActorId(event));
  return rejected;
});
