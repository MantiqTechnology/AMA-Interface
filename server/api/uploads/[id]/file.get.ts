import { createError, defineEventHandler, getQuery, sendStream, setHeader } from 'h3';
import { ZodError } from 'zod';
import { idParamSchema } from '../../../../shared/contracts/common';
import { DomainError } from '../../../utils/errors';
import { getLocalUploadFile } from '../../../utils/local-upload-storage';
import { parseParams } from '../../../utils/validation';

function contentDisposition(disposition: 'attachment' | 'inline', filename: string) {
  const fallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_') || 'download';
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function throwHttpError(error: unknown): never {
  if (error instanceof ZodError) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Request validation failed',
      data: error.flatten()
    });
  }

  if (error instanceof DomainError) {
    throw createError({
      statusCode: error.statusCode,
      statusMessage: error.message,
      data: {
        code: error.code,
        details: error.details
      }
    });
  }

  throw error;
}

export default defineEventHandler(async (event) => {
  try {
    const { id } = parseParams(event, idParamSchema);
    const { upload, stream } = await getLocalUploadFile(id);
    const query = getQuery(event);
    const disposition =
      query.download === '1' || query.download === 'true' ? 'attachment' : 'inline';

    setHeader(event, 'content-type', upload.contentType);
    setHeader(event, 'content-length', upload.size);
    setHeader(event, 'content-disposition', contentDisposition(disposition, upload.originalName));
    setHeader(event, 'cache-control', 'private, max-age=0, must-revalidate');

    return await sendStream(event, stream);
  } catch (error) {
    throwHttpError(error);
  }
});
