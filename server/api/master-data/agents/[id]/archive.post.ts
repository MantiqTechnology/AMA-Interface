import { agentsIdParamsSchema } from '../../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'agent.archive');
  const { id } = parseParams(event, agentsIdParamsSchema);
  return await getAgentService().archive(id, {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event)
  });
});
