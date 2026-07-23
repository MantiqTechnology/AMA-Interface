import { createStationServiceBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
import { getDemoActorContext, getDemoActorId, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'station.operation.update');
  const body = await parseBody(event, createStationServiceBodySchema);
  const service = getServices().flightOperations;
  service.assertActorStationScope(body.stationId, getDemoActorContext(event));
  return service.createStationService(body, getDemoActorId(event));
});
