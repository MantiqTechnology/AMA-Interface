import { idParamSchema } from '../../../shared/contracts/common';
import { updateDocumentBodySchema } from '../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../utils/api-response';
import { updateDocument } from '../../utils/local-document-storage';
import { parseBody, parseParams } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  const body = await parseBody(event, updateDocumentBodySchema);
  return await updateDocument(id, body);
});
