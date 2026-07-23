import {
  emptyLoadSubmitBodySchema,
  manifestIdParamsSchema
} from '#shared/contracts/flight-operations';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.manifest.submit');
  const { manifestId } = parseParams(event, manifestIdParamsSchema);
  const body = await parseBody(event, emptyLoadSubmitBodySchema);
  return getServices().flightOperations.submitManifest(
    manifestId,
    body,
    getDemoActorContext(event)
  );
});
