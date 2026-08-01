import { agentsInputSchema } from '../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'agent.manage');
  return getAgentService().create(await parseBody(event, agentsInputSchema), {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event)
  });
});
