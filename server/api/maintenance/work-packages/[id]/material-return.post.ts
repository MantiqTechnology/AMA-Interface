import { maintenanceIdParamsSchema } from '#shared/features/maintenance';
import { returnMaterialSchema } from '#shared/features/maintenance-v21-schemas';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.material.return');
  parseParams(event, maintenanceIdParamsSchema);
  const body = await parseBody(event, returnMaterialSchema);
  return getServices().resourceV21.returnMaterial(body, getDemoActorContext(event));
});
