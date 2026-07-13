import { getAgentService } from '../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getAgentService().options());
