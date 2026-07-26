import { agentsIdParamsSchema } from '../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'agent.read');
  return getAgentService().getDetail(parseParams(event, agentsIdParamsSchema).id);
});
