import type { H3Event } from 'h3';
import type { LocalUploadDto } from '../../shared/contracts/uploads';
import { getDbClient } from '../db/client';
import {
  getDemoActorId,
  getDemoStationScope,
  hasDemoPermission,
  requireDemoPermission
} from './auth';
import { requireDocumentOwnerAccess } from './document-access';
import { DomainError } from './errors';
import { getDocumentByUploadId } from './local-document-storage';

function canAccessStationEvidenceUpload(event: H3Event, uploadId: string) {
  const evidence = getDbClient()
    .sqlite.prepare(
      `SELECT evidence.id, task.station_id, station.station_code
       FROM flight_verification_evidence evidence
       LEFT JOIN flight_station_tasks task ON task.id = evidence.station_task_id
       LEFT JOIN stations station ON station.id = task.station_id
       WHERE evidence.upload_id = ?
       ORDER BY evidence.uploaded_at DESC, evidence.id DESC
       LIMIT 1`
    )
    .get(uploadId) as
    { id: string; station_id: string | null; station_code: string | null } | undefined;

  if (!evidence) return false;
  if (!hasDemoPermission(event, 'station.task.view')) return false;

  const scope = getDemoStationScope(event);
  if (scope.includes('ALL')) return true;

  return Boolean(evidence.station_code && scope.includes(evidence.station_code));
}

export async function requireUploadAccess(
  event: H3Event,
  upload: LocalUploadDto,
  action: 'read' | 'delete' = 'read'
) {
  requireDemoPermission(event, action === 'read' ? 'document.read' : 'document.upload');
  const actorId = getDemoActorId(event);

  if (action === 'read' && canAccessStationEvidenceUpload(event, upload.id)) {
    return;
  }

  if (upload.status === 'DRAFT') {
    if (upload.uploadedBy !== actorId) {
      throw new DomainError('UPLOAD_FORBIDDEN', 'The upload draft belongs to another user.', 403);
    }
    return;
  }

  if (action === 'delete') {
    throw new DomainError(
      'UPLOAD_ATTACHED_DELETE_BLOCKED',
      'Attached uploads must be managed through the document lifecycle.',
      409
    );
  }

  const document = await getDocumentByUploadId(upload.id);
  if (!document) {
    throw new DomainError(
      'UPLOAD_ATTACHMENT_INVALID',
      'Attached upload has no document record.',
      409
    );
  }
  requireDocumentOwnerAccess(
    event,
    document.ownerType,
    document.ownerId,
    document.visibility,
    document.documentType
  );
}
