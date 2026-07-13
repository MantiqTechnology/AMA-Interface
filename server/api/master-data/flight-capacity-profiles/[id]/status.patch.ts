import {
  flightCapacityProfilesIdParamsSchema,
  flightCapacityProfilesStatusSchema
} from '../../../../../shared/features/operations/flight-capacity-profiles';
import { getFlightCapacityProfileService } from '../../../../features/operations/flight-capacity-profiles';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, flightCapacityProfilesIdParamsSchema);
  const { isActive } = await parseBody(event, flightCapacityProfilesStatusSchema);
  return getFlightCapacityProfileService().setActive(id, isActive);
});
