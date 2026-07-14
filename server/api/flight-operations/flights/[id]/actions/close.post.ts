import { flightOperationIdParamsSchema } from '../../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../../utils/auth';
import { getServices } from '../../../../../utils/services';
import { parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'flight.closure.create');
  const params = parseParams(event, flightOperationIdParamsSchema);
  return getServices().flightOperations.closeFlight(params.id, getDemoActorId(event));
});
