import { createHash, createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import { basename, extname } from 'node:path';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { localUploadSchema, type LocalUploadDto } from '../../shared/contracts/uploads';
import { DomainError, notFound } from './errors';

const DEFAULT_REGION = 'auto';
const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const S3_UPLOAD_BASE_PATH = 's3';
const API_UPLOAD_BASE_PATH = '/api/uploads';
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

const uploadManifestSchema = z.object({
  uploads: z.array(localUploadSchema)
});

type UploadManifest = z.infer<typeof uploadManifestSchema>;

export type SaveS3UploadInput = {
  data: Buffer | Uint8Array;
  originalName: string;
  contentType?: string;
  id?: string;
  uploadedAt?: string;
};

export type S3UploadFile = {
  upload: LocalUploadDto;
  stream: Readable;
};

type S3UploadConfig = {
  endpoint: URL;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string | null;
};

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

function getMaxUploadBytes() {
  const configured = Number(process.env.AMA_UPLOAD_MAX_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_BYTES;
}

function endpointFromBucketUrl(value: string) {
  const url = new URL(value);
  const [bucket, ...rest] = url.pathname.replace(/^\/+/u, '').split('/');

  if (!bucket || rest.length > 0) {
    throw new DomainError(
      'S3_UPLOAD_BUCKET_INVALID',
      'S3_UPLOAD_BUCKET URL must be in the form https://endpoint.example.com/bucket-name',
      500
    );
  }

  url.pathname = '';
  url.search = '';
  url.hash = '';

  return {
    endpoint: url,
    bucket,
    publicBaseUrl: value.replace(/\/+$/u, '')
  };
}

function getS3UploadConfig(): S3UploadConfig | null {
  const bucketValue = process.env.S3_UPLOAD_BUCKET?.trim();
  const accessKeyId =
    process.env.S3_UPLOAD_ACCESS_KEY_ID?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.S3_UPLOAD_SECRET_ACCESS_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim();

  if (!bucketValue || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const bucketFromUrl = /^https?:\/\//u.test(bucketValue)
    ? endpointFromBucketUrl(bucketValue)
    : null;
  const endpointValue = process.env.S3_UPLOAD_ENDPOINT?.trim();
  const endpoint = bucketFromUrl
    ? bucketFromUrl.endpoint
    : endpointValue
      ? new URL(endpointValue)
      : null;

  if (!endpoint) {
    throw new DomainError(
      'S3_UPLOAD_ENDPOINT_REQUIRED',
      'S3_UPLOAD_ENDPOINT is required when S3_UPLOAD_BUCKET is a bucket name.',
      500
    );
  }

  endpoint.pathname = endpoint.pathname.replace(/\/+$/u, '');
  endpoint.search = '';
  endpoint.hash = '';

  return {
    endpoint,
    bucket: bucketFromUrl?.bucket ?? bucketValue,
    region:
      process.env.S3_UPLOAD_REGION?.trim() || process.env.AWS_REGION?.trim() || DEFAULT_REGION,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl:
      process.env.S3_UPLOAD_PUBLIC_BASE_URL?.trim().replace(/\/+$/u, '') ??
      bucketFromUrl?.publicBaseUrl ??
      null
  };
}

export function isS3UploadConfigured() {
  return getS3UploadConfig() !== null;
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest();
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/gu,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function objectPath(bucket: string, key: string) {
  return `/${encodePathSegment(bucket)}/${key.split('/').map(encodePathSegment).join('/')}`;
}

function amzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/gu, '');
}

function dateStamp(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function signingKey(secretAccessKey: string, date: string, region: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

function signedHeaders(
  config: S3UploadConfig,
  method: string,
  key: string,
  initHeaders: HeadersInit = {}
) {
  const now = new Date();
  const timestamp = amzDate(now);
  const date = dateStamp(now);
  const host = config.endpoint.host;
  const headers = new Headers(initHeaders);

  headers.set('host', host);
  headers.set('x-amz-content-sha256', UNSIGNED_PAYLOAD);
  headers.set('x-amz-date', timestamp);

  const entries = [...headers.entries()]
    .map(([name, value]) => [name.toLowerCase(), value.trim().replaceAll(/\s+/gu, ' ')] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  const canonicalHeaders = entries.map(([name, value]) => `${name}:${value}\n`).join('');
  const signedHeaderNames = entries.map(([name]) => name).join(';');
  const scope = `${date}/${config.region}/s3/aws4_request`;
  const canonicalRequest = [
    method,
    objectPath(config.bucket, key),
    '',
    canonicalHeaders,
    signedHeaderNames,
    UNSIGNED_PAYLOAD
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', timestamp, scope, sha256(canonicalRequest)].join('\n');
  const signature = createHmac('sha256', signingKey(config.secretAccessKey, date, config.region))
    .update(stringToSign)
    .digest('hex');

  headers.set(
    'authorization',
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaderNames}, Signature=${signature}`
  );

  return headers;
}

function objectUrl(config: S3UploadConfig, key: string) {
  const url = new URL(config.endpoint.toString());
  url.pathname = objectPath(config.bucket, key);
  return url;
}

function viewUrlFor(id: string) {
  return `${API_UPLOAD_BASE_PATH}/${encodeURIComponent(id)}/file`;
}

function downloadUrlFor(id: string) {
  return `${viewUrlFor(id)}?download=1`;
}

function publicUrlFor(config: S3UploadConfig, key: string) {
  if (!config.publicBaseUrl) return null;
  return `${config.publicBaseUrl}/${key.split('/').map(encodePathSegment).join('/')}`;
}

function manifestKey() {
  return process.env.S3_UPLOAD_MANIFEST_KEY?.trim() || '_manifests/ama-uploads.json';
}

async function s3Request(
  config: S3UploadConfig,
  method: string,
  key: string,
  init: RequestInit = {}
) {
  const headers = signedHeaders(config, method, key, init.headers);
  const response = await fetch(objectUrl(config, key), {
    ...init,
    method,
    headers
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new DomainError(
      'S3_UPLOAD_REQUEST_FAILED',
      `S3 upload request failed: ${response.status}`,
      502,
      {
        status: response.status,
        body: body.slice(0, 500)
      }
    );
  }

  return response;
}

async function readManifest(config: S3UploadConfig): Promise<UploadManifest> {
  const key = manifestKey();
  const response = await fetch(objectUrl(config, key), {
    method: 'GET',
    headers: signedHeaders(config, 'GET', key)
  });

  if (response.status === 404) {
    return { uploads: [] };
  }

  if (!response.ok) {
    throw new DomainError(
      'S3_UPLOAD_MANIFEST_READ_FAILED',
      `S3 upload manifest read failed: ${response.status}`,
      502
    );
  }

  try {
    return uploadManifestSchema.parse(await response.json());
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      throw new DomainError(
        'S3_UPLOAD_MANIFEST_INVALID',
        'S3 upload manifest is invalid and cannot be read',
        500
      );
    }

    throw error;
  }
}

async function writeManifest(config: S3UploadConfig, manifest: UploadManifest) {
  const key = manifestKey();
  await s3Request(config, 'PUT', key, {
    body: `${JSON.stringify(manifest, null, 2)}\n`,
    headers: {
      'content-type': 'application/json'
    }
  });
}

export async function listS3Uploads() {
  const config = getS3UploadConfig();
  if (!config)
    throw new DomainError('S3_UPLOAD_NOT_CONFIGURED', 'S3 upload storage is not configured.', 500);
  const manifest = await readManifest(config);
  return [...manifest.uploads].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function getS3Upload(id: string) {
  const config = getS3UploadConfig();
  if (!config)
    throw new DomainError('S3_UPLOAD_NOT_CONFIGURED', 'S3 upload storage is not configured.', 500);
  const manifest = await readManifest(config);
  const upload = manifest.uploads.find((item) => item.id === id);

  if (!upload) {
    throw notFound('Upload', id);
  }

  return upload;
}

export async function saveS3Upload(input: SaveS3UploadInput) {
  const config = getS3UploadConfig();
  if (!config)
    throw new DomainError('S3_UPLOAD_NOT_CONFIGURED', 'S3 upload storage is not configured.', 500);

  const buffer = Buffer.isBuffer(input.data) ? input.data : Buffer.from(input.data);
  const maxUploadBytes = getMaxUploadBytes();

  if (buffer.byteLength > maxUploadBytes) {
    throw new DomainError(
      'UPLOAD_TOO_LARGE',
      `Upload must be ${Math.floor(maxUploadBytes / 1024 / 1024)} MB or smaller`,
      413
    );
  }

  const id = input.id ?? nanoid(14);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new DomainError('INVALID_UPLOAD_ID', 'Upload ID contains unsupported characters', 400);
  }

  const uploadedAt = input.uploadedAt ?? new Date().toISOString();
  const originalName = cleanOriginalName(input.originalName);
  const extension = safeExtension(originalName);
  const filename = `${Date.parse(uploadedAt)}-${id}${extension}`;
  const key = `${S3_UPLOAD_BASE_PATH}/${filename}`;
  const contentType = input.contentType || 'application/octet-stream';

  await s3Request(config, 'PUT', key, {
    body: buffer as unknown as BodyInit,
    headers: {
      'content-type': contentType,
      'content-length': String(buffer.byteLength)
    }
  });

  const upload: LocalUploadDto = {
    id,
    originalName,
    filename,
    path: key,
    viewUrl: publicUrlFor(config, key) ?? viewUrlFor(id),
    downloadUrl: publicUrlFor(config, key) ?? downloadUrlFor(id),
    size: buffer.byteLength,
    contentType,
    isImage: Boolean(input.contentType?.startsWith('image/')),
    uploadedAt
  };

  const manifest = await readManifest(config);
  await writeManifest(config, { uploads: [upload, ...manifest.uploads] });

  return upload;
}

export async function getS3UploadFile(id: string): Promise<S3UploadFile> {
  const upload = await getS3Upload(id);
  const config = getS3UploadConfig();
  if (!config)
    throw new DomainError('S3_UPLOAD_NOT_CONFIGURED', 'S3 upload storage is not configured.', 500);

  const response = await s3Request(config, 'GET', upload.path);
  if (!response.body) {
    throw new DomainError('S3_UPLOAD_FILE_MISSING', `Upload file for ${id} was not found`, 404);
  }

  return {
    upload,
    stream: Readable.fromWeb(response.body as unknown as Parameters<typeof Readable.fromWeb>[0])
  };
}

export async function deleteS3Upload(id: string) {
  const config = getS3UploadConfig();
  if (!config)
    throw new DomainError('S3_UPLOAD_NOT_CONFIGURED', 'S3 upload storage is not configured.', 500);
  const manifest = await readManifest(config);
  const upload = manifest.uploads.find((item) => item.id === id);

  if (!upload) {
    throw notFound('Upload', id);
  }

  await s3Request(config, 'DELETE', upload.path);
  await writeManifest(config, { uploads: manifest.uploads.filter((item) => item.id !== id) });

  return upload;
}
