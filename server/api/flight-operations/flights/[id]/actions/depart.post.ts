import {
  actualTimeBodySchema,
  flightOperationIdParamsSchema
} from '../../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseBody, parseParams } from '../../../../../utils/validation';
import {
  getDemoActorId,
  requireDemoFlightStationAccess,
  requireDemoPermission
} from '../../../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.movement.update');
  const params = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, actualTimeBodySchema);
  const service = getServices().flightOperations;
  const flight = service.detail(params.id);
  requireDemoFlightStationAccess(event, [flight.originStationCode]);
  return service.depart(params.id, body, getDemoActorId(event));
});
