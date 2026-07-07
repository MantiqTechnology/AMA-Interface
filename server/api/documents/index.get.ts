import { documentListQuerySchema } from '../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../utils/api-response';
import { listDocuments } from '../../utils/local-document-storage';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const query = parseQuery(event, documentListQuerySchema);
  return await listDocuments(query);
});
