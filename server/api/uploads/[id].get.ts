import { idParamSchema } from '../../../shared/contracts/common';
import { defineApiEventHandler } from '../../utils/api-response';
import { getLocalUpload } from '../../utils/local-upload-storage';
import { parseParams } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  return await getLocalUpload(id);
});
