import { flightReasonsListQuerySchema } from '../../../../shared/features/operations/flight-reasons';
import { getFlightReasonService } from '../../../features/operations/flight-reasons';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getFlightReasonService().list(parseQuery(event, flightReasonsListQuerySchema))
);
