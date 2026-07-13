import {
  flightApprovalDecisionBodySchema,
  flightRequestIdParamsSchema
} from '../../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorId } from '../../../../../utils/auth';
import { getServices } from '../../../../../utils/services';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, flightRequestIdParamsSchema);
  const body = await parseBody(event, flightApprovalDecisionBodySchema);
  return getServices().flightOperations.decideRequest(id, body, getDemoActorId(event));
});
