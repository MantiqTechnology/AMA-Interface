import { createFlightOperationBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
import {
  getDemoActorId,
  requireDemoFlightStationAccess,
  requireDemoPermission
} from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.create.direct');
  const body = await parseBody(event, createFlightOperationBodySchema);
  const service = getServices().flightOperations;
  const stations = service.routeStationCodes(body.routeId);
  requireDemoFlightStationAccess(event, [stations.originStationCode]);
  return service.create(body, getDemoActorId(event));
});
