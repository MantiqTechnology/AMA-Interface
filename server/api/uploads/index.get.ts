import { defineApiEventHandler } from '../../utils/api-response';
import { listUploads } from '../../utils/upload-storage';

export default defineApiEventHandler(async () => {
  return await listUploads();
});
