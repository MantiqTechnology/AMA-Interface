import {
  aircraftIdParamsSchema,
  aircraftInputSchema
} from '../../../../shared/features/operations/aircraft';
import { getAircraftService } from '../../../features/operations/aircraft';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, aircraftIdParamsSchema);
  return getAircraftService().update(id, await parseBody(event, aircraftInputSchema));
});
