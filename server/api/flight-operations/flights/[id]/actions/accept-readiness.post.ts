import {
  approvalActionBodySchema,
  flightOperationIdParamsSchema
} from '../../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../../utils/auth';
import { getServices } from '../../../../../utils/services';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.readiness.approve');
  const params = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, approvalActionBodySchema);
  return getServices().flightOperations.acceptReadiness(params.id, body, getDemoActorId(event));
});
