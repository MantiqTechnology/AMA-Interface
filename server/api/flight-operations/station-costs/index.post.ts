import { createStationCostBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'station.operation.update');
  const body = await parseBody(event, createStationCostBodySchema);
  return getServices().flightOperations.createStationCost(body, getDemoActorId(event));
});
