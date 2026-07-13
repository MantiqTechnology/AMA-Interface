import { aircraftIdParamsSchema } from '../../../../shared/features/operations/aircraft';
import { getAircraftService } from '../../../features/operations/aircraft';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getAircraftService().get(parseParams(event, aircraftIdParamsSchema).id)
);
