import { listFlightRequestsQuerySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  const query = parseQuery(event, listFlightRequestsQuerySchema);
  return getServices().flightOperations.listRequests(query);
});
