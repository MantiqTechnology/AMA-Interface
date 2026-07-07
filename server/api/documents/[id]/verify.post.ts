import { idParamSchema } from '../../../../shared/contracts/common';
import { defineApiEventHandler } from '../../../utils/api-response';
import { verifyDocument } from '../../../utils/local-document-storage';
import { parseParams } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  return await verifyDocument(id);
});
