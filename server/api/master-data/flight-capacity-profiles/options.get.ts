import { getFlightCapacityProfileService } from '../../../features/operations/flight-capacity-profiles';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getFlightCapacityProfileService().options());
