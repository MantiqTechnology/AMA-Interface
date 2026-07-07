import { idParamSchema } from '../../../shared/contracts/common';
import { defineApiEventHandler } from '../../utils/api-response';
import { DomainError } from '../../utils/errors';
import { isUploadReferenced } from '../../utils/local-document-storage';
import { deleteLocalUpload } from '../../utils/local-upload-storage';
import { parseParams } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);

  if (await isUploadReferenced(id)) {
    throw new DomainError(
      'UPLOAD_REFERENCED_BY_DOCUMENT',
      'Upload is linked to a document and cannot be deleted.',
      409
    );
  }

  return await deleteLocalUpload(id);
});
