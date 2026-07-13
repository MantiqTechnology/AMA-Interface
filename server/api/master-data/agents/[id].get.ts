import { agentsIdParamsSchema } from '../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getAgentService().get(parseParams(event, agentsIdParamsSchema).id)
);
