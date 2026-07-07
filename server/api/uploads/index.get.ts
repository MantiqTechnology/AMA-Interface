import { defineApiEventHandler } from '../../utils/api-response';
import { listLocalUploads } from '../../utils/local-upload-storage';

export default defineApiEventHandler(async () => {
  return await listLocalUploads();
});
