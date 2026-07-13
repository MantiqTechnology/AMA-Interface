import { flightOperationIdParamsSchema } from '../../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorId } from '../../../../../utils/auth';
import { getServices } from '../../../../../utils/services';
import { parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler((event) => {
  const params = parseParams(event, flightOperationIdParamsSchema);
  return getServices().flightOperations.closeFlight(params.id, getDemoActorId(event));
});
