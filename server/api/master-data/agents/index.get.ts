import { agentsListQuerySchema } from '../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'agent.read');
  return getAgentService().list(parseQuery(event, agentsListQuerySchema));
});
