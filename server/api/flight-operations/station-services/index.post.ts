import { createStationServiceBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'station.operation.update');
  const body = await parseBody(event, createStationServiceBodySchema);
  return getServices().flightOperations.createStationService(body, getDemoActorId(event));
});
