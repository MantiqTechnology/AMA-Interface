import { createDocumentBodySchema } from '../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../utils/api-response';
import { createDocument } from '../../utils/local-document-storage';
import { parseBody } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const body = await parseBody(event, createDocumentBodySchema);
  return await createDocument(body);
});
