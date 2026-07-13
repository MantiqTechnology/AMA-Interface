import {
  crewIdParamsSchema,
  crewInputSchema
} from '../../../../shared/features/operations/personnel';
import { getPersonnelService } from '../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, crewIdParamsSchema);
  return getPersonnelService().update(id, await parseBody(event, crewInputSchema));
});
