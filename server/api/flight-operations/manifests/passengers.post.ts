import { createPassengerBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.manifest.prepare');
  const body = await parseBody(event, createPassengerBodySchema);
  return getServices().flightOperations.prepareManifestPassenger(body, getDemoActorContext(event));
});
