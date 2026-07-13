import { agentsListQuerySchema } from '../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getAgentService().list(parseQuery(event, agentsListQuerySchema))
);
