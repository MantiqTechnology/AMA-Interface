import { idParamSchema } from '../../../../shared/contracts/common';
import { supersedeDocumentBodySchema } from '../../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { supersedeDocument } from '../../../utils/local-document-storage';
import { parseBody, parseParams } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  const body = await parseBody(event, supersedeDocumentBodySchema);
  return await supersedeDocument(id, body);
});
