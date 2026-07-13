import { crewInputSchema } from '../../../../shared/features/operations/personnel';
import { getPersonnelService } from '../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getPersonnelService().create(await parseBody(event, crewInputSchema))
);
