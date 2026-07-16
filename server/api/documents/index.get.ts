import { documentListQuerySchema } from '../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../utils/api-response';
import { listDocuments } from '../../utils/local-document-storage';
import { parseQuery } from '../../utils/validation';
import { requireDemoPermission } from '../../utils/auth';
import { canAccessDocumentOwner } from '../../utils/document-access';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'document.read');
  const query = parseQuery(event, documentListQuerySchema);
  const documents = await listDocuments(query);
  return documents.filter((document) =>
    canAccessDocumentOwner(event, document.ownerType, document.ownerId)
  );
});
