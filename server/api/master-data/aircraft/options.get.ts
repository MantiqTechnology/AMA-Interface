import { getAircraftService } from '../../../features/operations/aircraft';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getAircraftService().options());
