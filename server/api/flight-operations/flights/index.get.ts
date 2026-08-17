import { listFlightOperationsQuerySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseQuery } from '../../../utils/validation';
import { getDemoStationScope, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'flight.read');
  const query = parseQuery(event, listFlightOperationsQuerySchema);
  return getServices().flightOperations.list(query, getDemoStationScope(event));
});
