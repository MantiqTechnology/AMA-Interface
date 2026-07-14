import {
  createFlightRequestBodySchema,
  flightRequestIdParamsSchema
} from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody, parseParams } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight_request.create');
  const { id } = parseParams(event, flightRequestIdParamsSchema);
  const body = await parseBody(event, createFlightRequestBodySchema);
  return getServices().flightOperations.updateRequest(id, body);
});
