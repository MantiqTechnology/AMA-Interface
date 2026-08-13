import { maintenanceIdParamsSchema } from '#shared/features/maintenance';
import { defineApiEventHandler } from '#server/utils/api-response';
import { requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseParams } from '#server/utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.v21.resource.read');
  const { id } = parseParams(event, maintenanceIdParamsSchema);
  return getServices().resourceV21.evaluateMroEligibility(id);
});
