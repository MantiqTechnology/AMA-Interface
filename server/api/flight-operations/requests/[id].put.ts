import {
  createFlightRequestBodySchema,
  flightRequestIdParamsSchema
} from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody, parseParams } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, flightRequestIdParamsSchema);
  const body = await parseBody(event, createFlightRequestBodySchema);
  return getServices().flightOperations.updateRequest(id, body);
});
