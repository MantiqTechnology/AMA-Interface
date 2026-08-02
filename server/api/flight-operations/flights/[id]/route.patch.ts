import {
  flightOperationIdParamsSchema,
  flightOperationRouteUpdateBodySchema
} from '../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../utils/api-response';
import {
  getDemoActorContext,
  requireDemoFlightStationAccess,
  requireDemoPermission
} from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.create.direct');
  const params = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, flightOperationRouteUpdateBodySchema);
  const service = getServices().flightOperations;
  const flight = service.detail(params.id);
  requireDemoFlightStationAccess(event, [flight.originStationCode]);
  return service.changeRouteAssignment(params.id, body, getDemoActorContext(event));
});
