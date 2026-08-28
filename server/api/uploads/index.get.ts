import { defineApiEventHandler } from '../../utils/api-response';
import { listUploads } from '../../utils/upload-storage';
import { getDemoActorId, requireDemoPermission } from '../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'document.read');
  const actorId = getDemoActorId(event);
  return (await listUploads()).filter(
    (upload) => upload.status === 'DRAFT' && upload.uploadedBy === actorId
  );
});
