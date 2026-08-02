import {
  flightLifecycleCommandBodySchema,
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
  requireDemoPermission(event, 'flight.schedule');
  const params = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, flightLifecycleCommandBodySchema);
  const service = getServices().flightOperations;
  const flight = service.detail(params.id);
  requireDemoFlightStationAccess(event, [flight.originStationCode]);
  return service.transition(params.id, 'SCHEDULED', getDemoActorId(event), body);
});
