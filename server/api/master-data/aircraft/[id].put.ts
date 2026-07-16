import {
  aircraftIdParamsSchema,
  aircraftInputSchema
} from '../../../../shared/features/operations/aircraft';
import { getAircraftService } from '../../../features/operations/aircraft';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'platform.module.manage');
  const { id } = parseParams(event, aircraftIdParamsSchema);
  return getAircraftService().update(id, await parseBody(event, aircraftInputSchema));
});
