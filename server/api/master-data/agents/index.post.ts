import { agentsInputSchema } from '../../../../shared/features/commercial/agents';
import { getAgentService } from '../../../features/commercial/agents';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getAgentService().create(await parseBody(event, agentsInputSchema))
);
