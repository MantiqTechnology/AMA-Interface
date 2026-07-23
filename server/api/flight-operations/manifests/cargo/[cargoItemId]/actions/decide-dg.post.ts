import { cargoItemIdParamsSchema, dgDecisionBodySchema } from '#shared/contracts/flight-operations';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.manifest.dg.decide');
  const { cargoItemId } = parseParams(event, cargoItemIdParamsSchema);
  const body = await parseBody(event, dgDecisionBodySchema);
  return getServices().flightOperations.decideDangerousGoods(
    cargoItemId,
    body,
    getDemoActorContext(event)
  );
});
