import { createCargoBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.manifest.update');
  const body = await parseBody(event, createCargoBodySchema);
  return getServices().flightOperations.createCargo(body, getDemoActorId(event));
});
