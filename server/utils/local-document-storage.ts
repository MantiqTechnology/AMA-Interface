import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  daysUntilDate,
  getDocumentLifecycleStatus,
  masterDocumentSchema,
  type CreateDocumentBody,
  type DocumentListQuery,
  type DocumentLifecycleStatus,
  type MasterDocument,
  type MasterDocumentDto,
  type SupersedeDocumentBody,
  type UpdateDocumentBody
} from '../../shared/contracts/documents';
import { getDocumentTypeConfig } from '../../shared/constants/document-types';
import { DomainError, notFound } from './errors';
import { getLocalUpload, saveLocalUpload } from './local-upload-storage';

const DEFAULT_MANIFEST_PATH = join(process.cwd(), 'data', 'local-documents.json');
const DEMO_USER = 'Demo Admin';

const documentManifestSchema = z.object({
  documents: z.array(masterDocumentSchema)
});

type DocumentManifest = z.infer<typeof documentManifestSchema>;

type DemoDocumentSeed = {
  ownerType: MasterDocument['ownerType'];
  ownerId: string;
  documentType: string;
  title: string;
  documentNumber: string;
  issuer: string;
  expiresAt?: string;
  verificationStatus?: MasterDocument['verificationStatus'];
  visibility?: MasterDocument['visibility'];
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

function getManifestPath() {
  return resolveWritablePath(process.env.AMA_DOCUMENT_MANIFEST ?? DEFAULT_MANIFEST_PATH);
}

async function readManifest(): Promise<DocumentManifest> {
  try {
    const raw = await readFile(getManifestPath(), 'utf8');
    return documentManifestSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { documents: [] };
    }

    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      throw new DomainError('DOCUMENT_MANIFEST_INVALID', 'Local document manifest is invalid', 500);
    }

    throw error;
  }
}

async function writeManifest(manifest: DocumentManifest) {
  const manifestPath = getManifestPath();
  await mkdir(dirname(manifestPath), { recursive: true });

  const temporaryPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(temporaryPath, manifestPath);
}

function normalizeOptional(value: string | undefined) {
  return value?.trim() || undefined;
}

function buildDocument(input: CreateDocumentBody, timestamp: string, version = 1): MasterDocument {
  return {
    id: `doc-${nanoid(12)}`,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    uploadId: input.uploadId,
    documentType: input.documentType,
    title: input.title,
    documentNumber: normalizeOptional(input.documentNumber),
    issuer: normalizeOptional(input.issuer),
    issuedAt: input.issuedAt,
    validFrom: input.validFrom,
    expiresAt: input.expiresAt,
    revision: normalizeOptional(input.revision),
    verificationStatus: 'PENDING_VERIFICATION',
    visibility: input.visibility,
    notes: normalizeOptional(input.notes),
    version,
    uploadedBy: DEMO_USER,
    uploadedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

async function toDto(document: MasterDocument): Promise<MasterDocumentDto> {
  let upload: MasterDocumentDto['upload'];

  try {
    upload = await getLocalUpload(document.uploadId);
  } catch {
    upload = undefined;
  }

  const lifecycleStatus = getDocumentLifecycleStatus(document);
  const daysUntilExpiry =
    document.expiresAt && lifecycleStatus !== 'SUPERSEDED'
      ? daysUntilDate(document.expiresAt)
      : undefined;

  return {
    ...document,
    lifecycleStatus,
    daysUntilExpiry,
    upload
  };
}

function matchesSearch(document: MasterDocument, search: string) {
  if (!search) return true;

  const normalized = search.toLowerCase();
  return [
    document.title,
    document.documentType,
    document.documentNumber,
    document.issuer,
    document.notes
  ].some((value) => value?.toLowerCase().includes(normalized));
}

function matchesLifecycle(
  document: MasterDocument,
  lifecycleStatus: DocumentLifecycleStatus | undefined,
  expiringWithinDays: number | undefined
) {
  const current = getDocumentLifecycleStatus(document, undefined, expiringWithinDays ?? 30);
  if (lifecycleStatus && current !== lifecycleStatus) return false;
  return true;
}

function escapePdfText(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function createDemoPdf(title: string, lines: string[]) {
  const contentLines = [
    'SIMULATED DOCUMENT - FOR DEMO ONLY',
    'NOT VALID FOR OPERATIONAL OR LEGAL USE',
    '',
    title,
    ...lines
  ];
  const stream = [
    'BT',
    '/F1 18 Tf',
    '72 760 Td',
    `(${escapePdfText(contentLines[0])}) Tj`,
    '/F1 11 Tf',
    ...contentLines.slice(1).flatMap((line) => ['0 -22 Td', `(${escapePdfText(line)}) Tj`]),
    'ET'
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf);
}

const demoDocumentSeeds: DemoDocumentSeed[] = [
  {
    ownerType: 'aircraft',
    ownerId: 'ref-ac-pk-ama',
    documentType: 'AIRCRAFT_CERTIFICATE_OF_REGISTRATION',
    title: 'PK-AMA Certificate of Registration',
    documentNumber: 'SIM-COR-PKAMA-2026',
    issuer: 'AMA Demo Registry',
    expiresAt: '2027-03-30'
  },
  {
    ownerType: 'aircraft',
    ownerId: 'ref-ac-pk-ama',
    documentType: 'AIRCRAFT_CERTIFICATE_OF_AIRWORTHINESS',
    title: 'PK-AMA Certificate of Airworthiness',
    documentNumber: 'SIM-COA-PKAMA-2026',
    issuer: 'AMA Demo Airworthiness Office',
    expiresAt: '2026-07-19'
  },
  {
    ownerType: 'aircraft',
    ownerId: 'ref-ac-pk-ama',
    documentType: 'AIRCRAFT_INSURANCE_CERTIFICATE',
    title: 'PK-AMA Insurance Certificate',
    documentNumber: 'SIM-INS-PKAMA-2026',
    issuer: 'Demo Aviation Insurance',
    expiresAt: '2027-01-15'
  },
  {
    ownerType: 'aircraft',
    ownerId: 'ref-ac-pk-ama',
    documentType: 'AIRCRAFT_WEIGHT_AND_BALANCE',
    title: 'PK-AMA Weight & Balance Report',
    documentNumber: 'SIM-WB-PKAMA-2026',
    issuer: 'AMA Demo Maintenance',
    expiresAt: '2026-06-24'
  },
  {
    ownerType: 'personnel',
    ownerId: 'ref-crew-pic-expired',
    documentType: 'PILOT_LICENSE',
    title: 'Pilot Licence - Yohanis Tabuni Demo',
    documentNumber: 'SIM-LIC-PIC-003',
    issuer: 'AMA Demo Licensing',
    expiresAt: '2026-06-25'
  },
  {
    ownerType: 'personnel',
    ownerId: 'ref-crew-pic-expired',
    documentType: 'PILOT_MEDICAL_CERTIFICATE',
    title: 'Medical Certificate - Yohanis Tabuni Demo',
    documentNumber: 'SIM-MED-PIC-003',
    issuer: 'Demo Aviation Medical',
    expiresAt: '2026-06-30',
    visibility: 'RESTRICTED'
  },
  {
    ownerType: 'personnel',
    ownerId: 'ref-crew-pic-expiring',
    documentType: 'PILOT_RECURRENCY_TRAINING',
    title: 'Recurrency Training - Mikael Kogoya Demo',
    documentNumber: 'SIM-TRN-PIC-002',
    issuer: 'AMA Demo Training',
    expiresAt: '2026-07-27',
    verificationStatus: 'PENDING_VERIFICATION'
  },
  {
    ownerType: 'station',
    ownerId: 'ref-st-djj',
    documentType: 'STATION_INFORMATION_SHEET',
    title: 'Sentani Station Information Sheet',
    documentNumber: 'SIM-STN-DJJ-INFO',
    issuer: 'AMA Demo Station Ops',
    expiresAt: '2027-04-01'
  },
  {
    ownerType: 'station',
    ownerId: 'ref-st-djj',
    documentType: 'STATION_LOCAL_SOP',
    title: 'Sentani Local SOP',
    documentNumber: 'SIM-STN-DJJ-SOP',
    issuer: 'AMA Demo Station Ops',
    expiresAt: '2026-08-04'
  },
  {
    ownerType: 'vendor',
    ownerId: 'ref-vendor-maintenance',
    documentType: 'VENDOR_LEGAL_DOCUMENT',
    title: 'Maintenance Vendor Legal Document',
    documentNumber: 'SIM-VND-MAINT-LEGAL',
    issuer: 'Demo Vendor Registry',
    expiresAt: '2027-02-01'
  },
  {
    ownerType: 'vendor',
    ownerId: 'ref-vendor-maintenance',
    documentType: 'VENDOR_BANK_VERIFICATION',
    title: 'Maintenance Vendor Bank Verification',
    documentNumber: 'SIM-VND-MAINT-BANK',
    issuer: 'Demo Finance Review',
    expiresAt: '2026-07-28',
    visibility: 'RESTRICTED'
  },
  {
    ownerType: 'customer',
    ownerId: 'ref-cust-papua-logistics',
    documentType: 'CHARTER_AGREEMENT',
    title: 'Papua Logistics Charter Agreement',
    documentNumber: 'SIM-CUST-PLG-AGR',
    issuer: 'AMA Demo Commercial',
    expiresAt: '2026-12-31'
  },
  {
    ownerType: 'customer',
    ownerId: 'ref-cust-papua-logistics',
    documentType: 'CUSTOMER_RATE_CARD',
    title: 'Papua Logistics Rate Card',
    documentNumber: 'SIM-CUST-PLG-RATE',
    issuer: 'AMA Demo Commercial',
    expiresAt: '2026-08-01'
  },
  {
    ownerType: 'route',
    ownerId: 'ref-route-djj-wmx',
    documentType: 'ROUTE_RISK_ASSESSMENT',
    title: 'DJJ-WMX Route Risk Assessment',
    documentNumber: 'SIM-RTE-DJJ-WMX',
    issuer: 'AMA Demo OCC',
    expiresAt: '2026-07-16'
  }
];

async function ensureDemoDocuments(manifest: DocumentManifest) {
  if (process.env.NODE_ENV === 'test' || manifest.documents.length > 0) {
    return manifest;
  }

  const timestamp = new Date().toISOString();
  const documents: MasterDocument[] = [];

  for (const seed of demoDocumentSeeds) {
    const type = getDocumentTypeConfig(seed.documentType);
    const upload = await saveLocalUpload({
      originalName: `${seed.documentNumber}.pdf`,
      contentType: 'application/pdf',
      data: createDemoPdf(seed.title, [
        `Document number: ${seed.documentNumber}`,
        `Issuer: ${seed.issuer}`,
        `Owner: ${seed.ownerType} ${seed.ownerId}`,
        seed.expiresAt ? `Expires: ${seed.expiresAt}` : 'No expiry date',
        `Document type: ${type?.label ?? seed.documentType}`
      ])
    });

    const document = buildDocument(
      {
        ownerType: seed.ownerType,
        ownerId: seed.ownerId,
        uploadId: upload.id,
        documentType: seed.documentType,
        title: seed.title,
        documentNumber: seed.documentNumber,
        issuer: seed.issuer,
        issuedAt: '2026-01-01',
        validFrom: '2026-01-01',
        expiresAt: seed.expiresAt,
        visibility: seed.visibility ?? (type?.restricted ? 'RESTRICTED' : 'INTERNAL')
      },
      timestamp
    );

    documents.push({
      ...document,
      verificationStatus: seed.verificationStatus ?? 'VERIFIED',
      verifiedBy: seed.verificationStatus === 'PENDING_VERIFICATION' ? undefined : DEMO_USER,
      verifiedAt: seed.verificationStatus === 'PENDING_VERIFICATION' ? undefined : timestamp
    });
  }

  const seeded = { documents };
  await writeManifest(seeded);
  return seeded;
}

async function readSeededManifest() {
  const manifest = await readManifest();
  return await ensureDemoDocuments(manifest);
}

export async function listDocuments(filters: DocumentListQuery = { search: '' }) {
  const manifest = await readSeededManifest();
  const lifecycleStatus = filters.lifecycleStatus ?? filters.status;
  const documents = manifest.documents
    .filter((document) => !filters.ownerType || document.ownerType === filters.ownerType)
    .filter((document) => !filters.ownerId || document.ownerId === filters.ownerId)
    .filter((document) => !filters.documentType || document.documentType === filters.documentType)
    .filter((document) => !filters.visibility || document.visibility === filters.visibility)
    .filter(
      (document) =>
        !filters.verificationStatus || document.verificationStatus === filters.verificationStatus
    )
    .filter((document) => matchesLifecycle(document, lifecycleStatus, filters.expiringWithinDays))
    .filter((document) => matchesSearch(document, filters.search ?? ''))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return await Promise.all(documents.map(toDto));
}

export async function getDocument(id: string) {
  const manifest = await readSeededManifest();
  const document = manifest.documents.find((item) => item.id === id);

  if (!document) {
    throw notFound('Document', id);
  }

  return await toDto(document);
}

export async function createDocument(input: CreateDocumentBody) {
  await getLocalUpload(input.uploadId);

  const timestamp = new Date().toISOString();
  const manifest = await readSeededManifest();
  const document = buildDocument(input, timestamp);

  await writeManifest({ documents: [document, ...manifest.documents] });
  return await toDto(document);
}

export async function updateDocument(id: string, input: UpdateDocumentBody) {
  const manifest = await readSeededManifest();
  const index = manifest.documents.findIndex((item) => item.id === id);

  if (index === -1) {
    throw notFound('Document', id);
  }

  const existing = manifest.documents[index];
  const updated: MasterDocument = {
    ...existing,
    documentType: input.documentType ?? existing.documentType,
    title: input.title ?? existing.title,
    documentNumber: normalizeOptional(input.documentNumber) ?? existing.documentNumber,
    issuer: normalizeOptional(input.issuer) ?? existing.issuer,
    issuedAt: input.issuedAt ?? existing.issuedAt,
    validFrom: input.validFrom ?? existing.validFrom,
    expiresAt: input.expiresAt ?? existing.expiresAt,
    revision: normalizeOptional(input.revision) ?? existing.revision,
    visibility: input.visibility ?? existing.visibility,
    notes: normalizeOptional(input.notes) ?? existing.notes,
    updatedAt: new Date().toISOString()
  };

  manifest.documents[index] = updated;
  await writeManifest(manifest);
  return await toDto(updated);
}

export async function verifyDocument(id: string) {
  const manifest = await readSeededManifest();
  const index = manifest.documents.findIndex((item) => item.id === id);

  if (index === -1) {
    throw notFound('Document', id);
  }

  const timestamp = new Date().toISOString();
  const updated: MasterDocument = {
    ...manifest.documents[index],
    verificationStatus: 'VERIFIED',
    rejectionReason: undefined,
    verifiedBy: DEMO_USER,
    verifiedAt: timestamp,
    updatedAt: timestamp
  };

  manifest.documents[index] = updated;
  await writeManifest(manifest);
  return await toDto(updated);
}

export async function rejectDocument(id: string, rejectionReason: string) {
  const manifest = await readSeededManifest();
  const index = manifest.documents.findIndex((item) => item.id === id);

  if (index === -1) {
    throw notFound('Document', id);
  }

  const timestamp = new Date().toISOString();
  const updated: MasterDocument = {
    ...manifest.documents[index],
    verificationStatus: 'REJECTED',
    verifiedBy: undefined,
    verifiedAt: undefined,
    rejectionReason,
    updatedAt: timestamp
  };

  manifest.documents[index] = updated;
  await writeManifest(manifest);
  return await toDto(updated);
}

export async function supersedeDocument(id: string, input: SupersedeDocumentBody) {
  await getLocalUpload(input.uploadId);

  const manifest = await readSeededManifest();
  const index = manifest.documents.findIndex((item) => item.id === id);

  if (index === -1) {
    throw notFound('Document', id);
  }

  const existing = manifest.documents[index];
  const timestamp = new Date().toISOString();
  const replacement = buildDocument(
    {
      ownerType: existing.ownerType,
      ownerId: existing.ownerId,
      uploadId: input.uploadId,
      documentType: input.documentType,
      title: input.title,
      documentNumber: input.documentNumber,
      issuer: input.issuer,
      issuedAt: input.issuedAt,
      validFrom: input.validFrom,
      expiresAt: input.expiresAt,
      revision: input.revision,
      visibility: input.visibility,
      notes: input.notes
    },
    timestamp,
    existing.version + 1
  );
  replacement.replacesDocumentId = existing.id;

  const superseded: MasterDocument = {
    ...existing,
    supersededByDocumentId: replacement.id,
    updatedAt: timestamp
  };

  manifest.documents[index] = superseded;
  await writeManifest({ documents: [replacement, ...manifest.documents] });
  return await toDto(replacement);
}

export async function deleteDocument(id: string) {
  const manifest = await readSeededManifest();
  const document = manifest.documents.find((item) => item.id === id);

  if (!document) {
    throw notFound('Document', id);
  }

  if (document.verificationStatus === 'VERIFIED') {
    throw new DomainError(
      'DOCUMENT_VERIFIED_DELETE_BLOCKED',
      'Verified documents cannot be deleted.',
      409
    );
  }

  await writeManifest({ documents: manifest.documents.filter((item) => item.id !== id) });
  return await toDto(document);
}

export async function isUploadReferenced(uploadId: string) {
  const manifest = await readManifest();
  return manifest.documents.some((document) => document.uploadId === uploadId);
}
