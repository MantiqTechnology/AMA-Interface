import {
  flightTrackingIdParamsSchema,
  positionReportBodySchema
} from '../../../../../shared/contracts/aircraft-tracking';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.movement.update');
  const params = parseParams(event, flightTrackingIdParamsSchema);
  const body = await parseBody(event, positionReportBodySchema);
  return getServices().aircraftTracking.reportForFlight(params.id, body, getDemoActorId(event));
});
