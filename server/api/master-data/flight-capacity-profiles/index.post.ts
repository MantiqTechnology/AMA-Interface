import { flightCapacityProfilesInputSchema } from '../../../../shared/features/operations/flight-capacity-profiles';
import { getFlightCapacityProfileService } from '../../../features/operations/flight-capacity-profiles';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getFlightCapacityProfileService().create(
    await parseBody(event, flightCapacityProfilesInputSchema)
  )
);
