import { crewIdParamsSchema } from '../../../../../shared/features/operations/personnel';
import { listDocuments } from '../../../../utils/local-document-storage';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'personnel.documents.read');
  const { id } = parseParams(event, crewIdParamsSchema);
  return listDocuments({ ownerType: 'personnel', ownerId: id, search: '' });
});
