import {
  agentsIdParamsSchema,
  agentsInputSchema
} from '../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, agentsIdParamsSchema);
  return getAgentService().update(id, await parseBody(event, agentsInputSchema));
});
