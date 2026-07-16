import { createDocumentBodySchema } from '../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../utils/api-response';
import { createDocument } from '../../utils/local-document-storage';
import { parseBody } from '../../utils/validation';
import { requireDemoPermission } from '../../utils/auth';
import { requireDocumentOwnerAccess } from '../../utils/document-access';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'document.upload');
  const body = await parseBody(event, createDocumentBodySchema);
  requireDocumentOwnerAccess(event, body.ownerType, body.ownerId);
  return await createDocument(body);
});
