import {
  manifestExpectedVersionSchema,
  manifestIdParamsSchema
} from '#shared/contracts/flight-operations';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.manifest.review');
  const { manifestId } = parseParams(event, manifestIdParamsSchema);
  const { expectedVersion } = await parseBody(event, manifestExpectedVersionSchema);
  return getServices().flightOperations.approveManifest(
    manifestId,
    expectedVersion,
    getDemoActorContext(event)
  );
});
