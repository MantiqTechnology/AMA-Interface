import { reserveMaterialSchema } from '#shared/features/maintenance-v21-schemas';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.material.reserve');
  const input = await parseBody(event, reserveMaterialSchema);
  return getServices().resourceV21.reserveMaterial(input, getDemoActorContext(event));
});
