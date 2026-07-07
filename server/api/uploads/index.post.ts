import { readMultipartFormData } from 'h3';
import { defineApiEventHandler } from '../../utils/api-response';
import { DomainError } from '../../utils/errors';
import { saveLocalUpload } from '../../utils/local-upload-storage';

export default defineApiEventHandler(async (event) => {
  const form = await readMultipartFormData(event);
  const file = form?.find((part) => part.name === 'file' && part.filename);

  if (!file?.data || !file.filename) {
    throw new DomainError('UPLOAD_REQUIRED', 'Upload requires a file field', 422);
  }

  return await saveLocalUpload({
    data: file.data,
    originalName: file.filename,
    contentType: file.type
  });
});
