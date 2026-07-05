import { createFlightOrderBodySchema } from '../../../shared/contracts/flights';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseBody } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const body = await parseBody(event, createFlightOrderBodySchema);
  return await getServices().flights.createFlightOrder(body);
});
