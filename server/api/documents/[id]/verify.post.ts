import { idParamSchema } from '../../../../shared/contracts/common';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDocument, verifyDocument } from '../../../utils/local-document-storage';
import { parseParams } from '../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { requireDocumentOwnerAccess } from '../../../utils/document-access';
import { invalidateFlightDocumentReadiness } from '../../../utils/flight-document-readiness';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'document.verify');
  const { id } = parseParams(event, idParamSchema);
  const document = await getDocument(id);
  requireDocumentOwnerAccess(event, document.ownerType, document.ownerId);
  const verified = await verifyDocument(id);
  invalidateFlightDocumentReadiness(document.ownerType, document.ownerId, getDemoActorId(event));
  return verified;
});
