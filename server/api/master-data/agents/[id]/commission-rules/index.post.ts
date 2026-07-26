import {
  agentCommissionRuleInputSchema,
  agentsIdParamsSchema
} from '../../../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../../../utils/auth';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'agent.commission.manage');
  const { id } = parseParams(event, agentsIdParamsSchema);
  return await getAgentService().createCommissionRule(
    id,
    await parseBody(event, agentCommissionRuleInputSchema),
    { actorId: getDemoActorId(event), actorName: getDemoRole(event) }
  );
});
