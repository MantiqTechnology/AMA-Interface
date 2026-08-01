import {
  agentContactIdParamsSchema,
  agentContactInputSchema
} from '../../../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../../utils/auth';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'agent.contact.manage');
  const { id, contactId } = parseParams(event, agentContactIdParamsSchema);
  return await getAgentService().updateContact(
    id,
    contactId,
    await parseBody(event, agentContactInputSchema),
    { actorId: getDemoActorId(event), actorName: getDemoRole(event) }
  );
});
