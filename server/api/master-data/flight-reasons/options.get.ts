import { getFlightReasonService } from '../../../features/operations/flight-reasons';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getFlightReasonService().options());
