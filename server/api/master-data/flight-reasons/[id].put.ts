import {
  flightReasonsIdParamsSchema,
  flightReasonsInputSchema
} from '../../../../shared/features/operations/flight-reasons';
import { getFlightReasonService } from '../../../features/operations/flight-reasons';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, flightReasonsIdParamsSchema);
  return getFlightReasonService().update(id, await parseBody(event, flightReasonsInputSchema));
});
