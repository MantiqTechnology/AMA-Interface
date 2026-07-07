import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDocumentLifecycleStatus } from '../../shared/contracts/documents';
import {
  createDocument,
  deleteDocument,
  getDocument,
  isUploadReferenced,
  listDocuments,
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
});

describe('local document storage', () => {
  it('creates and filters documents by owner', async () => {
    const upload = await saveLocalUpload({
      data: Buffer.from('demo document'),
      originalName: 'certificate.pdf',
      contentType: 'application/pdf'
    });

    const document = await createDocument({
      ownerType: 'aircraft',
      ownerId: 'ref-ac-pk-ama',
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
      ownerId: 'ref-ac-pk-ama',
      search: ''
    });
    expect(ownerDocuments.map((item) => item.id)).toEqual([document.id]);

    const otherOwnerDocuments = await listDocuments({
      ownerType: 'station',
      ownerId: 'ref-st-djj',
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
      ownerId: 'ref-crew-pic-expired',
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
      ownerId: 'ref-cust-papua-logistics',
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
        ownerId: 'ref-agent-djj-counter',
        uploadId: upload.id,
        documentType: 'AGENCY_AGREEMENT',
        title: 'Agent Agreement',
        visibility: 'INTERNAL'
      });

      const documents = await listDocuments({
        ownerType: 'company',
        ownerId: 'ref-agent-djj-counter',
        search: ''
      });

      expect(documents.map((item) => item.id)).toEqual([document.id]);
      expect(documents[0].upload?.viewUrl).toBe(`/api/uploads/${upload.id}/file`);
    } finally {
      await rm(runtimePath, { recursive: true, force: true });
    }
  });
});
