import { listFlightsQuerySchema } from '../../../shared/contracts/flights';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const query = parseQuery(event, listFlightsQuerySchema);
  return await getServices().flights.listFlights(query);
});
