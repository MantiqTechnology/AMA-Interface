import { flightPlanningContextQuerySchema } from '../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../utils/api-response';
import { requireDemoPermission } from '../../utils/auth';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight_request.create');
  const query = parseQuery(event, flightPlanningContextQuerySchema);
  return getServices().flightOperations.planningContext(query);
});
