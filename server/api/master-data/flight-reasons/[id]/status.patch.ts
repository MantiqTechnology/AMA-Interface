import {
  flightReasonsIdParamsSchema,
  flightReasonsStatusSchema
} from '../../../../../shared/features/operations/flight-reasons';
import { getFlightReasonService } from '../../../../features/operations/flight-reasons';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, flightReasonsIdParamsSchema);
  const { isActive } = await parseBody(event, flightReasonsStatusSchema);
  return getFlightReasonService().setActive(id, isActive);
});
