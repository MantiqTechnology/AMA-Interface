import { flightTrackingIdParamsSchema } from '../../../../../../shared/contracts/aircraft-tracking';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../../utils/auth';
import { getServices } from '../../../../../utils/services';
import { parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'flight.movement.update');
  const params = parseParams(event, flightTrackingIdParamsSchema);
  return getServices().aircraftTracking.advanceDemoPosition(params.id, getDemoActorId(event));
});
