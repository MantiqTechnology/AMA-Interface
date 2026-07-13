import { aircraftListQuerySchema } from '../../../../shared/features/operations/aircraft';
import { getAircraftService } from '../../../features/operations/aircraft';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getAircraftService().list(parseQuery(event, aircraftListQuerySchema))
);
