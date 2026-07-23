import { createDocumentBodySchema } from '../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../utils/api-response';
import { createDocument } from '../../utils/local-document-storage';
import { parseBody } from '../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../utils/auth';
import { requireDocumentOwnerAccess } from '../../utils/document-access';
import { invalidateFlightDocumentReadiness } from '../../utils/flight-document-readiness';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'document.upload');
  const body = await parseBody(event, createDocumentBodySchema);
  requireDocumentOwnerAccess(event, body.ownerType, body.ownerId);
  const document = await createDocument(body);
  invalidateFlightDocumentReadiness(body.ownerType, body.ownerId, getDemoActorId(event));
  return document;
});
