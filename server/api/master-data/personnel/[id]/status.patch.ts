import {
  crewIdParamsSchema,
  crewStatusSchema
} from '../../../../../shared/features/operations/personnel';
import { getPersonnelService } from '../../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, crewIdParamsSchema);
  const { isActive } = await parseBody(event, crewStatusSchema);
  return getPersonnelService().setActive(id, isActive);
});
