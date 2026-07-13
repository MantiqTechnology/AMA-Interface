import { flightReasonsIdParamsSchema } from '../../../../shared/features/operations/flight-reasons';
import { getFlightReasonService } from '../../../features/operations/flight-reasons';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getFlightReasonService().get(parseParams(event, flightReasonsIdParamsSchema).id)
);
