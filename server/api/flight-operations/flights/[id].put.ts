import {
  createFlightOperationBodySchema,
  flightOperationIdParamsSchema
} from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody, parseParams } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const params = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, createFlightOperationBodySchema);
  return getServices().flightOperations.update(params.id, body);
});
