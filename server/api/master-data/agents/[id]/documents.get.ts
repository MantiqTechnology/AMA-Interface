import { agentsIdParamsSchema } from '../../../../../shared/features/commercial/agents';
import { listDocuments } from '../../../../utils/local-document-storage';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'agent.document.read');
  const { id } = parseParams(event, agentsIdParamsSchema);
  return await listDocuments({ ownerType: 'commercial_agent', ownerId: id, search: '' });
});
