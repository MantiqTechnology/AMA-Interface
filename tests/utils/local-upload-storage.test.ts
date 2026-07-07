import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  deleteLocalUpload,
  getLocalUploadFile,
  listLocalUploads,
  saveLocalUpload
} from '../../server/utils/local-upload-storage';

let uploadDir: string;
let manifestPath: string;
let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), 'ama-local-uploads-'));
  uploadDir = join(tempRoot, 'uploads');
  manifestPath = join(tempRoot, 'local-uploads.json');

  process.env.AMA_UPLOAD_DIR = uploadDir;
  process.env.AMA_UPLOAD_MANIFEST = manifestPath;
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });

  delete process.env.AMA_UPLOAD_DIR;
  delete process.env.AMA_UPLOAD_MANIFEST;
});

describe('local upload storage', () => {
  it('stores, lists, resolves, and deletes a local upload', async () => {
    const upload = await saveLocalUpload({
      data: Buffer.from('hello upload'),
      originalName: '../receipt.txt',
      contentType: 'text/plain'
    });

    expect(upload.originalName).toBe('receipt.txt');
    expect(upload.filename).toMatch(/\.txt$/);
    expect(upload.path).toBe(`local/${upload.filename}`);
    expect(upload.viewUrl).toBe(`/api/uploads/${upload.id}/file`);
    expect(upload.downloadUrl).toBe(`/api/uploads/${upload.id}/file?download=1`);
    expect(upload.isImage).toBe(false);

    const uploads = await listLocalUploads();
    expect(uploads).toHaveLength(1);
    expect(uploads[0].id).toBe(upload.id);

    const file = await getLocalUploadFile(upload.id);
    await expect(readFile(file.absolutePath, 'utf8')).resolves.toBe('hello upload');

    await deleteLocalUpload(upload.id);

    await expect(listLocalUploads()).resolves.toEqual([]);
    await expect(readFile(file.absolutePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('marks image uploads for preview rendering', async () => {
    const upload = await saveLocalUpload({
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      originalName: 'photo.png',
      contentType: 'image/png'
    });

    expect(upload.isImage).toBe(true);
  });
});
