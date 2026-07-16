import { aircraftInputSchema } from '../../../../shared/features/operations/aircraft';
import { getAircraftService } from '../../../features/operations/aircraft';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'platform.module.manage');
  return getAircraftService().create(await parseBody(event, aircraftInputSchema));
});
