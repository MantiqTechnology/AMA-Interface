import {
  flightChangePreviewBodySchema,
  flightOperationIdParamsSchema
} from '../../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '../../../../../utils/auth';
import { getServices } from '../../../../../utils/services';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.read');
  const { id } = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, flightChangePreviewBodySchema);
  setResponseHeader(event, 'Cache-Control', 'private, no-store');
  return getServices().flightOperations.previewFlightChange(id, body, getDemoActorContext(event));
});
