import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '../../../../../utils/auth';
import { getServices } from '../../../../../utils/services';
import { parseBody, parseParams } from '../../../../../utils/validation';
import {
  flightOperationIdParamsSchema,
  reconcileActualsBodySchema
} from '#shared/contracts/flight-operations';

export default defineApiEventHandler(async (event) => {
  const { id: flightId } = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, reconcileActualsBodySchema);
  await requireDemoPermission(event, 'readiness.attest');

  const services = getServices();
  services.flightOperations.assertFlightStationScope(flightId, getDemoActorContext(event));
  const result = await services.flightOperations.reconcileFlightActuals(
    {
      ...body,
      flightId
    },
    getDemoActorContext(event)
  );

  return result;
});
