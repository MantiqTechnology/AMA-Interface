import { flightCapacityProfilesListQuerySchema } from '../../../../shared/features/operations/flight-capacity-profiles';
import { getFlightCapacityProfileService } from '../../../features/operations/flight-capacity-profiles';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getFlightCapacityProfileService().list(parseQuery(event, flightCapacityProfilesListQuerySchema))
);
