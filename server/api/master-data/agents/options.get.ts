import { getAgentService } from '../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'agent.read');
  return getAgentService().options();
});
