import { aircraftInputSchema } from '../../../../shared/features/operations/aircraft';
import { getAircraftService } from '../../../features/operations/aircraft';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getAircraftService().create(await parseBody(event, aircraftInputSchema))
);
