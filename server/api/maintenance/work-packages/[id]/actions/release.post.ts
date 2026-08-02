import { maintenanceIdParamsSchema, maintenanceReleaseSchema } from '#shared/features/maintenance';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'maintenance.release.issue');
  const { id } = parseParams(event, maintenanceIdParamsSchema);
  const body = await parseBody(event, maintenanceReleaseSchema);
  return getServices().maintenance.releaseWorkPackage(id, body, getDemoActorContext(event));
});
