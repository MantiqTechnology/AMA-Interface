import {
  agentLifecycleCommandSchema,
  agentsIdParamsSchema
} from '../../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'agent.activate');
  const { id } = parseParams(event, agentsIdParamsSchema);
  return await getAgentService().activate(id, await parseBody(event, agentLifecycleCommandSchema), {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event)
  });
});
