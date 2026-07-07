import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { localUploadSchema, type LocalUploadDto } from '../../shared/contracts/uploads';
import { DomainError, notFound } from './errors';

const DEFAULT_UPLOAD_DIR = join(process.cwd(), 'data', 'uploads', 'local');
const DEFAULT_MANIFEST_PATH = join(process.cwd(), 'data', 'local-uploads.json');
const LOCAL_UPLOAD_BASE_PATH = 'local';
const API_UPLOAD_BASE_PATH = '/api/uploads';
const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const uploadManifestSchema = z.object({
  uploads: z.array(localUploadSchema)
});

type UploadManifest = z.infer<typeof uploadManifestSchema>;

export type SaveLocalUploadInput = {
  data: Buffer | Uint8Array;
  originalName: string;
  contentType?: string;
};

export type LocalUploadFile = {
  upload: LocalUploadDto;
  absolutePath: string;
  stream: ReturnType<typeof createReadStream>;
};

function isEphemeralRuntime() {
  return Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';
}

function resolveWritablePath(path: string) {
  if (!isEphemeralRuntime()) {
    return path;
  }

  if (!isAbsolute(path)) {
    return join('/tmp', path);
  }

  if (path.startsWith('/var/task/')) {
    return join('/tmp', basename(path));
  }

  return path;
}

function getUploadDir() {
  return resolveWritablePath(process.env.AMA_UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR);
}

function getManifestPath() {
  return resolveWritablePath(process.env.AMA_UPLOAD_MANIFEST ?? DEFAULT_MANIFEST_PATH);
}

function getMaxUploadBytes() {
  const configured = Number(process.env.AMA_UPLOAD_MAX_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_BYTES;
}

function assertInsideDirectory(baseDir: string, targetPath: string) {
  const relativePath = relative(baseDir, targetPath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new DomainError(
      'INVALID_UPLOAD_PATH',
      'Upload path is outside the local upload directory',
      400
    );
  }
}

function cleanOriginalName(filename: string) {
  const cleaned = basename(filename)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  return cleaned || 'upload.bin';
}

function safeExtension(filename: string) {
  const extension = extname(filename).toLowerCase();

  if (!extension || extension.length > 16 || !/^\.[a-z0-9]+$/i.test(extension)) {
    return '.bin';
  }

  return extension;
}

function storageKeyFor(filename: string) {
  return `${LOCAL_UPLOAD_BASE_PATH}/${filename}`;
}

function viewUrlFor(id: string) {
  return `${API_UPLOAD_BASE_PATH}/${encodeURIComponent(id)}/file`;
}

function downloadUrlFor(id: string) {
  return `${viewUrlFor(id)}?download=1`;
}

function uploadPathFor(filename: string) {
  const baseDir = resolve(getUploadDir());
  const absolutePath = resolve(baseDir, filename);
  assertInsideDirectory(baseDir, absolutePath);
  return absolutePath;
}

async function readManifest(): Promise<UploadManifest> {
  try {
    const raw = await readFile(getManifestPath(), 'utf8');
    return uploadManifestSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { uploads: [] };
    }

    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      throw new DomainError(
        'UPLOAD_MANIFEST_INVALID',
        'Local upload manifest is invalid and cannot be read',
        500
      );
    }

    throw error;
  }
}

async function writeManifest(manifest: UploadManifest) {
  const manifestPath = getManifestPath();
  await mkdir(dirname(manifestPath), { recursive: true });

  const temporaryPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(temporaryPath, manifestPath);
}

export async function listLocalUploads() {
  const manifest = await readManifest();
  return [...manifest.uploads].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function getLocalUpload(id: string) {
  const manifest = await readManifest();
  const upload = manifest.uploads.find((item) => item.id === id);

  if (!upload) {
    throw notFound('Upload', id);
  }

  return upload;
}

export async function saveLocalUpload(input: SaveLocalUploadInput) {
  const buffer = Buffer.isBuffer(input.data) ? input.data : Buffer.from(input.data);
  const maxUploadBytes = getMaxUploadBytes();

  if (buffer.byteLength > maxUploadBytes) {
    throw new DomainError(
      'UPLOAD_TOO_LARGE',
      `Upload must be ${Math.floor(maxUploadBytes / 1024 / 1024)} MB or smaller`,
      413
    );
  }

  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const id = nanoid(14);
  const originalName = cleanOriginalName(input.originalName);
  const extension = safeExtension(originalName);
  const filename = `${Date.now()}-${id}${extension}`;
  const absolutePath = uploadPathFor(filename);

  await writeFile(absolutePath, buffer);

  const upload: LocalUploadDto = {
    id,
    originalName,
    filename,
    path: storageKeyFor(filename),
    viewUrl: viewUrlFor(id),
    downloadUrl: downloadUrlFor(id),
    size: buffer.byteLength,
    contentType: input.contentType || 'application/octet-stream',
    isImage: Boolean(input.contentType?.startsWith('image/')),
    uploadedAt: new Date().toISOString()
  };

  const manifest = await readManifest();
  await writeManifest({ uploads: [upload, ...manifest.uploads] });

  return upload;
}

export async function getLocalUploadFile(id: string): Promise<LocalUploadFile> {
  const upload = await getLocalUpload(id);
  const absolutePath = uploadPathFor(upload.filename);

  try {
    await stat(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new DomainError('UPLOAD_FILE_MISSING', `Upload file for ${id} was not found`, 404);
    }

    throw error;
  }

  return {
    upload,
    absolutePath,
    stream: createReadStream(absolutePath)
  };
}

export async function deleteLocalUpload(id: string) {
  const manifest = await readManifest();
  const upload = manifest.uploads.find((item) => item.id === id);

  if (!upload) {
    throw notFound('Upload', id);
  }

  await rm(uploadPathFor(upload.filename), { force: true });
  await writeManifest({ uploads: manifest.uploads.filter((item) => item.id !== id) });

  return upload;
}
