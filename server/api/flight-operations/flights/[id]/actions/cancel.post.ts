import {
  flightOperationIdParamsSchema,
  flightReasonActionBodySchema
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
  requireDemoPermission(event, 'flight.exception.update');
  const params = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, flightReasonActionBodySchema);
  const service = getServices().flightOperations;
  const flight = service.detail(params.id);
  requireDemoFlightStationAccess(event, [flight.originStationCode, flight.destinationStationCode]);
  return service.cancel(params.id, body, getDemoActorId(event));
});
