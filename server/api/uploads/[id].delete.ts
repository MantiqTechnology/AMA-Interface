import { idParamSchema } from '../../../shared/contracts/common';
import { defineApiEventHandler } from '../../utils/api-response';
import { deleteUpload, getUpload } from '../../utils/upload-storage';
import { parseParams } from '../../utils/validation';
import { getDemoActorId } from '../../utils/auth';
import { requireUploadAccess } from '../../utils/upload-access';
import { recordUploadAudit } from '../../utils/upload-audit';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);

  const upload = await getUpload(id);
  await requireUploadAccess(event, upload, 'delete');
  const deleted = await deleteUpload(id);
  await recordUploadAudit({
    action: 'DELETE',
    uploadId: id,
    actorId: getDemoActorId(event),
    requestId: String(event.context.requestId ?? '')
  });
  return deleted;
});
