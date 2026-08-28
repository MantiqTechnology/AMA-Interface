import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type UploadAuditAction = 'CREATE' | 'ATTACH' | 'VIEW' | 'DOWNLOAD' | 'DELETE';

export async function recordUploadAudit(input: {
  action: UploadAuditAction;
  uploadId: string;
  actorId: string;
  requestId?: string;
  ownerType?: string;
  ownerId?: string;
}) {
  const auditPath =
    process.env.AMA_UPLOAD_AUDIT_PATH ?? join(process.cwd(), 'data', 'upload-audit.jsonl');
  await mkdir(dirname(auditPath), { recursive: true });
  await appendFile(
    auditPath,
    `${JSON.stringify({ ...input, occurredAt: new Date().toISOString() })}\n`,
    { encoding: 'utf8', mode: 0o600 }
  );
}
