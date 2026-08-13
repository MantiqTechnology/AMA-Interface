import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocumentLifecycleStatus } from '../../shared/contracts/documents';
import {
  createDocument,
  deleteDocument,
  getDocument,
  isUploadReferenced,
  listDocuments,
  resetAndSeedLocalDocuments,
  supersedeDocument,
  verifyDocument
} from '../../server/utils/local-document-storage';
import { saveLocalUpload } from '../../server/utils/local-upload-storage';

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), 'ama-local-documents-'));
  process.env.AMA_UPLOAD_DIR = join(tempRoot, 'uploads');
  process.env.AMA_UPLOAD_MANIFEST = join(tempRoot, 'local-uploads.json');
  process.env.AMA_DOCUMENT_MANIFEST = join(tempRoot, 'local-documents.json');
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });

  delete process.env.AMA_UPLOAD_DIR;
  delete process.env.AMA_UPLOAD_MANIFEST;
  delete process.env.AMA_DOCUMENT_MANIFEST;
  delete process.env.VERCEL;
  delete process.env.S3_UPLOAD_BUCKET;
  delete process.env.S3_UPLOAD_ENDPOINT;
  delete process.env.S3_UPLOAD_REGION;
  delete process.env.S3_UPLOAD_MANIFEST_KEY;
  delete process.env.S3_UPLOAD_ACCESS_KEY_ID;
  delete process.env.S3_UPLOAD_SECRET_ACCESS_KEY;
  delete process.env.S3_UPLOAD_PUBLIC_BASE_URL;
  vi.unstubAllGlobals();
});

function installS3FetchMock() {
  const objects = new Map<string, string | Buffer>();

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const key = decodeURIComponent(url.pathname.replace(/^\/ama-test-bucket\//u, ''));
      const method = init?.method ?? 'GET';

      if (method === 'GET') {
        const body = objects.get(key);
        return body === undefined
          ? new Response('', { status: 404 })
          : new Response(typeof body === 'string' ? body : new Uint8Array(body));
      }

      if (method === 'PUT') {
        const body = init?.body;
        objects.set(key, typeof body === 'string' ? body : Buffer.from(body as Uint8Array));
        return new Response('', { status: 200 });
      }

      if (method === 'DELETE') {
        objects.delete(key);
        return new Response('', { status: 200 });
      }

      return new Response('', { status: 405 });
    })
  );

  return objects;
}

describe('local document storage', () => {
  it('creates and filters documents by owner', async () => {
    const upload = await saveLocalUpload({
      data: Buffer.from('demo document'),
      originalName: 'certificate.pdf',
      contentType: 'application/pdf'
    });

    const document = await createDocument({
      ownerType: 'aircraft',
      ownerId: 'ac-pk-ama',
      uploadId: upload.id,
      documentType: 'AIRCRAFT_CERTIFICATE_OF_AIRWORTHINESS',
      title: 'Certificate of Airworthiness',
      expiresAt: '2999-01-01',
      visibility: 'INTERNAL'
    });

    expect(document.upload?.id).toBe(upload.id);
    expect(document.lifecycleStatus).toBe('ACTIVE');
    await expect(isUploadReferenced(upload.id)).resolves.toBe(true);

    const ownerDocuments = await listDocuments({
      ownerType: 'aircraft',
      ownerId: 'ac-pk-ama',
      search: ''
    });
    expect(ownerDocuments.map((item) => item.id)).toEqual([document.id]);

    const otherOwnerDocuments = await listDocuments({
      ownerType: 'station',
      ownerId: 'st-djj',
      search: ''
    });
    expect(otherOwnerDocuments).toEqual([]);
  });

  it('calculates lifecycle status and supersedes old versions', async () => {
    expect(
      getDocumentLifecycleStatus(
        { expiresAt: '2026-07-20', supersededByDocumentId: undefined },
        new Date('2026-07-07T00:00:00.000Z')
      )
    ).toBe('EXPIRING');
    expect(
      getDocumentLifecycleStatus(
        { expiresAt: '2026-06-30', supersededByDocumentId: undefined },
        new Date('2026-07-07T00:00:00.000Z')
      )
    ).toBe('EXPIRED');

    const firstUpload = await saveLocalUpload({
      data: Buffer.from('v1'),
      originalName: 'medical-v1.pdf',
      contentType: 'application/pdf'
    });
    const first = await createDocument({
      ownerType: 'personnel',
      ownerId: 'crew-pic-expired',
      uploadId: firstUpload.id,
      documentType: 'PILOT_MEDICAL_CERTIFICATE',
      title: 'Medical Certificate',
      expiresAt: '2026-06-30',
      visibility: 'RESTRICTED'
    });

    const nextUpload = await saveLocalUpload({
      data: Buffer.from('v2'),
      originalName: 'medical-v2.pdf',
      contentType: 'application/pdf'
    });
    const next = await supersedeDocument(first.id, {
      uploadId: nextUpload.id,
      documentType: 'PILOT_MEDICAL_CERTIFICATE',
      title: 'Medical Certificate',
      expiresAt: '2999-01-01',
      visibility: 'RESTRICTED'
    });

    expect(next.version).toBe(2);
    await expect(getDocument(first.id)).resolves.toMatchObject({
      lifecycleStatus: 'SUPERSEDED',
      supersededByDocumentId: next.id
    });
  });

  it('blocks deletion for verified document metadata', async () => {
    const upload = await saveLocalUpload({
      data: Buffer.from('verified'),
      originalName: 'charter.pdf',
      contentType: 'application/pdf'
    });
    const document = await createDocument({
      ownerType: 'customer',
      ownerId: 'cust-papua-logistics',
      uploadId: upload.id,
      documentType: 'CHARTER_AGREEMENT',
      title: 'Charter Agreement',
      visibility: 'INTERNAL'
    });

    await verifyDocument(document.id);
    await expect(deleteDocument(document.id)).rejects.toMatchObject({
      code: 'DOCUMENT_VERIFIED_DELETE_BLOCKED'
    });
  });

  it('stores documents in writable temp storage on Vercel', async () => {
    const runtimeRoot = `ama-vercel-documents-${Date.now()}`;
    const runtimePath = join(tmpdir(), runtimeRoot);

    process.env.VERCEL = '1';
    process.env.AMA_UPLOAD_DIR = `${runtimeRoot}/uploads`;
    process.env.AMA_UPLOAD_MANIFEST = `${runtimeRoot}/local-uploads.json`;
    process.env.AMA_DOCUMENT_MANIFEST = `${runtimeRoot}/local-documents.json`;

    try {
      const upload = await saveLocalUpload({
        data: Buffer.from('vercel document'),
        originalName: 'agent-contract.pdf',
        contentType: 'application/pdf'
      });

      const document = await createDocument({
        ownerType: 'company',
        ownerId: 'agent-djj-counter',
        uploadId: upload.id,
        documentType: 'AGENCY_AGREEMENT',
        title: 'Agent Agreement',
        visibility: 'INTERNAL'
      });

      const documents = await listDocuments({
        ownerType: 'company',
        ownerId: 'agent-djj-counter',
        search: ''
      });

      expect(documents.map((item) => item.id)).toEqual([document.id]);
      expect(documents[0].upload?.viewUrl).toBe(`/api/uploads/${upload.id}/file`);
    } finally {
      await rm(runtimePath, { recursive: true, force: true });
    }
  });

  it('seeds demo document uploads through the active S3 driver', async () => {
    const objects = installS3FetchMock();
    process.env.S3_UPLOAD_BUCKET = 'ama-test-bucket';
    process.env.S3_UPLOAD_ENDPOINT = 'https://r2.example.test';
    process.env.S3_UPLOAD_REGION = 'auto';
    process.env.S3_UPLOAD_MANIFEST_KEY = '_manifests/test-uploads.json';
    process.env.S3_UPLOAD_ACCESS_KEY_ID = 'test-access-key';
    process.env.S3_UPLOAD_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.S3_UPLOAD_PUBLIC_BASE_URL = '';

    await resetAndSeedLocalDocuments();

    const documents = await listDocuments({ search: '' });
    expect(documents.length).toBeGreaterThan(0);
    expect(documents[0].upload?.viewUrl).toMatch(/^\/api\/uploads\/.+\/file$/u);
    expect([...objects.keys()].some((key) => key.startsWith('s3/'))).toBe(true);
    expect(objects.has('_manifests/test-uploads.json')).toBe(true);
  });
});
