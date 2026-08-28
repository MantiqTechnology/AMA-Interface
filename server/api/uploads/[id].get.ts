import { idParamSchema } from '../../../shared/contracts/common';
import { defineApiEventHandler } from '../../utils/api-response';
import { getUpload } from '../../utils/upload-storage';
import { parseParams } from '../../utils/validation';
import { requireUploadAccess } from '../../utils/upload-access';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  const upload = await getUpload(id);
  await requireUploadAccess(event, upload);
  return upload;
});
