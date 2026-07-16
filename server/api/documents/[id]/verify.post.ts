import { idParamSchema } from '../../../../shared/contracts/common';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDocument, verifyDocument } from '../../../utils/local-document-storage';
import { parseParams } from '../../../utils/validation';
import { requireDemoPermission } from '../../../utils/auth';
import { requireDocumentOwnerAccess } from '../../../utils/document-access';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'document.verify');
  const { id } = parseParams(event, idParamSchema);
  const document = await getDocument(id);
  requireDocumentOwnerAccess(event, document.ownerType, document.ownerId);
  return await verifyDocument(id);
});
