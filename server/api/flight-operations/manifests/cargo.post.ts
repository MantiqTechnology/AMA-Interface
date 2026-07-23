import { createCargoBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
import { getDemoActorContext, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.manifest.prepare');
  const body = await parseBody(event, createCargoBodySchema);
  return getServices().flightOperations.prepareManifestCargo(body, getDemoActorContext(event));
});
