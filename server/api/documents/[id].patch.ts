import { idParamSchema } from '../../../shared/contracts/common';
import { updateDocumentBodySchema } from '../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../utils/api-response';
import { getDocument, updateDocument } from '../../utils/local-document-storage';
import { parseBody, parseParams } from '../../utils/validation';
import { requireDemoPermission } from '../../utils/auth';
import { requireDocumentOwnerAccess } from '../../utils/document-access';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'document.upload');
  const { id } = parseParams(event, idParamSchema);
  const document = await getDocument(id);
  requireDocumentOwnerAccess(event, document.ownerType, document.ownerId);
  const body = await parseBody(event, updateDocumentBodySchema);
  return await updateDocument(id, body);
});
