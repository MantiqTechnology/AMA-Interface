import { flightReasonsInputSchema } from '../../../../shared/features/operations/flight-reasons';
import { getFlightReasonService } from '../../../features/operations/flight-reasons';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getFlightReasonService().create(await parseBody(event, flightReasonsInputSchema))
);
