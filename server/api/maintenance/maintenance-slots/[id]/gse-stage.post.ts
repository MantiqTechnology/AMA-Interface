import {
  maintenanceIdParamsSchema,
  stageMaintenanceResourceSchema
} from '#shared/features/maintenance';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'maintenance.package.plan');
  const { id } = parseParams(event, maintenanceIdParamsSchema);
  const body = await parseBody(event, stageMaintenanceResourceSchema);
  return getServices().maintenance.stageGse(id, body, getDemoActorContext(event));
});
