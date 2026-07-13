import { flightCapacityProfilesIdParamsSchema } from '../../../../shared/features/operations/flight-capacity-profiles';
import { getFlightCapacityProfileService } from '../../../features/operations/flight-capacity-profiles';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getFlightCapacityProfileService().get(parseParams(event, flightCapacityProfilesIdParamsSchema).id)
);
