import { createError, defineEventHandler, getRouterParam, sendStream, setHeader } from 'h3';
import { DomainError } from '../../utils/errors';
import { getS3ObjectFile } from '../../utils/s3-upload-storage';

const allowedImageExtensions = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif']
]);

function throwHttpError(error: unknown): never {
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

function parseAircraftImageKey(value: string | undefined) {
  const key = decodeURIComponent(value ?? '').replace(/^\/+/u, '');
  const extension = key.split('.').at(-1)?.toLowerCase() ?? '';

  if (
    !key.startsWith('aircraft/') ||
    key.includes('..') ||
    key.includes('\\') ||
    !allowedImageExtensions.has(extension)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Aircraft image key is invalid'
    });
  }

  return {
    key,
    contentType: allowedImageExtensions.get(extension) ?? 'application/octet-stream'
  };
}

export default defineEventHandler(async (event) => {
  try {
    const { key, contentType } = parseAircraftImageKey(getRouterParam(event, 'key'));
    const object = await getS3ObjectFile(key, contentType);

    setHeader(event, 'content-type', object.contentType);
    setHeader(event, 'cache-control', 'public, max-age=86400, stale-while-revalidate=604800');

    return await sendStream(event, object.stream);
  } catch (error) {
    throwHttpError(error);
  }
});
