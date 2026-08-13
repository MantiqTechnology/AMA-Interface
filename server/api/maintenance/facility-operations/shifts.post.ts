import { createMaintenanceFacilityShiftSchema } from '#shared/features/maintenance';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'maintenance.package.plan');
  const body = await parseBody(event, createMaintenanceFacilityShiftSchema);
  return getServices().maintenance.createFacilityShift(body, getDemoActorContext(event));
});
