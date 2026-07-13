import {
  flightCapacityProfilesIdParamsSchema,
  flightCapacityProfilesInputSchema
} from '../../../../shared/features/operations/flight-capacity-profiles';
import { getFlightCapacityProfileService } from '../../../features/operations/flight-capacity-profiles';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, flightCapacityProfilesIdParamsSchema);
  return getFlightCapacityProfileService().update(
    id,
    await parseBody(event, flightCapacityProfilesInputSchema)
  );
});
