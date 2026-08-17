import { issueMaterialSchema } from '#shared/features/maintenance-v21-schemas';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.material.issue');
  const input = await parseBody(event, issueMaterialSchema);
  return getServices().resourceV21.issueMaterial(input, getDemoActorContext(event));
});
