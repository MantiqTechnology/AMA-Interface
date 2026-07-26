import { agentCommissionRuleIdParamsSchema } from '../../../../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../../../utils/auth';
import { parseParams } from '../../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'agent.commission.manage');
  const { id, ruleId } = parseParams(event, agentCommissionRuleIdParamsSchema);
  return await getAgentService().archiveCommissionRule(id, ruleId, {
    actorId: getDemoActorId(event),
    actorName: getDemoRole(event)
  });
});
