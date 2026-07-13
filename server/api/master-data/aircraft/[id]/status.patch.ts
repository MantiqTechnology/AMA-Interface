import {
  aircraftIdParamsSchema,
  aircraftStatusSchema
} from '../../../../../shared/features/operations/aircraft';
import { getAircraftService } from '../../../../features/operations/aircraft';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, aircraftIdParamsSchema);
  const { isActive } = await parseBody(event, aircraftStatusSchema);
  return getAircraftService().setActive(id, isActive);
});
