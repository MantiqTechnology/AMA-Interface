import { createStationCostBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
import { getDemoActorContext, getDemoActorId, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'station.operation.update');
  const body = await parseBody(event, createStationCostBodySchema);
  const service = getServices().flightOperations;
  service.assertActorStationScope(body.stationId, getDemoActorContext(event));
  return service.createStationCost(body, getDemoActorId(event));
});
