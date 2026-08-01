import {
  flightOperationCommercialUpdateBodySchema,
  flightOperationIdParamsSchema
} from '../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getServices } from '../../../../utils/services';
import { parseBody, parseParams } from '../../../../utils/validation';
import {
  getDemoActorId,
  requireDemoFlightStationAccess,
  requireDemoPermission
} from '../../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.create.direct');
  const params = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, flightOperationCommercialUpdateBodySchema);
  const service = getServices().flightOperations;
  const flight = service.detail(params.id);
  requireDemoFlightStationAccess(event, [flight.originStationCode]);
  return service.updateCommercialDetails(
    params.id,
    {
      customerId: body.customerId ?? null,
      billingType: body.billingType,
      estimatedRevenue: body.estimatedRevenue ?? null
    },
    getDemoActorId(event)
  );
});
