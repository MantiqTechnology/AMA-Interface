import { idParamSchema } from '../../../../shared/contracts/common';
import { rejectDocumentBodySchema } from '../../../../shared/contracts/documents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { rejectDocument } from '../../../utils/local-document-storage';
import { parseBody, parseParams } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  const body = await parseBody(event, rejectDocumentBodySchema);
  return await rejectDocument(id, body.rejectionReason);
});
