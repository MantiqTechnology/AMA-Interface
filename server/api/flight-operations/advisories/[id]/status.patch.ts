import {
  operationalAdvisoryIdParamsSchema,
  operationalAdvisoryStatusBodySchema
} from '../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.advisory.manage');
  const params = parseParams(event, operationalAdvisoryIdParamsSchema);
  const body = await parseBody(event, operationalAdvisoryStatusBodySchema);
  return getServices().flightOperations.setOperationalAdvisoryStatus(
    params.id,
    body.status,
    body.reason,
    getDemoActorId(event)
  );
});
