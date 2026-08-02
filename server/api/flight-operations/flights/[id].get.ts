import { flightOperationIdParamsSchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseParams } from '../../../utils/validation';
import { getDemoActorContext, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'flight.read');
  const params = parseParams(event, flightOperationIdParamsSchema);
  setResponseHeader(event, 'Cache-Control', 'private, no-store');
  return getServices().flightOperations.detailForActor(params.id, getDemoActorContext(event));
});
