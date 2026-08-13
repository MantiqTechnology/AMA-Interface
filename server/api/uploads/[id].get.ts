import { idParamSchema } from '../../../shared/contracts/common';
import { defineApiEventHandler } from '../../utils/api-response';
import { getUpload } from '../../utils/upload-storage';
import { parseParams } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  return await getUpload(id);
});
