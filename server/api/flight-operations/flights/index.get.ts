import { listFlightOperationsQuerySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  const query = parseQuery(event, listFlightOperationsQuerySchema);
  return getServices().flightOperations.list(query);
});
