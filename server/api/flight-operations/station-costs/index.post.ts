import { createStationCostBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const body = await parseBody(event, createStationCostBodySchema);
  return getServices().flightOperations.createStationCost(body);
});
