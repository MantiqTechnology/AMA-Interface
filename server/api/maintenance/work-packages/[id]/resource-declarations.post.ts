import { maintenanceIdParamsSchema } from '#shared/features/maintenance';
import { declareResourceSchema } from '#shared/features/maintenance-v21-schemas';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'maintenance.v21.resource.write');
  const { id } = parseParams(event, maintenanceIdParamsSchema);
  const body = await parseBody(event, declareResourceSchema);
  return getServices().resourceV21.declareResource(id, body, getDemoActorContext(event));
});
