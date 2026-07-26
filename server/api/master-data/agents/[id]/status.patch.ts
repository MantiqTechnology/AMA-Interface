import {
  agentsIdParamsSchema,
  agentsStatusSchema
} from '../../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'agent.manage');
  const { id } = parseParams(event, agentsIdParamsSchema);
  const { isActive } = await parseBody(event, agentsStatusSchema);
  return getAgentService().setActive(id, isActive, {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event)
  });
});
