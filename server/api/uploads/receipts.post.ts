import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { nanoid } from 'nanoid';
import { readMultipartFormData } from 'h3';
import { defineApiEventHandler } from '../../utils/api-response';
import { DomainError } from '../../utils/errors';

const uploadDir = join(process.cwd(), 'public', 'uploads', 'mock-receipts');

export default defineApiEventHandler(async (event) => {
  const form = await readMultipartFormData(event);
  const file = form?.find((part) => part.name === 'file' && part.filename);

  if (!file?.data || !file.filename) {
    throw new DomainError('UPLOAD_REQUIRED', 'Receipt upload requires a file field', 422);
  }

  await mkdir(uploadDir, { recursive: true });

  const extension = extname(file.filename).toLowerCase() || '.bin';
  const filename = `${Date.now()}-${nanoid(8)}${extension}`;
  const absolutePath = join(uploadDir, filename);
  await writeFile(absolutePath, file.data);

  return {
    filename,
    path: `/uploads/mock-receipts/${filename}`,
    size: file.data.byteLength,
    contentType: file.type ?? 'application/octet-stream'
  };
});
