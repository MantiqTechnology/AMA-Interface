import { maintenanceIdParamsSchema } from '#shared/features/maintenance';
import { createMaterialRequirementSchema } from '#shared/features/maintenance-v21-schemas';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'maintenance.v21.resource.write');
  const { id } = parseParams(event, maintenanceIdParamsSchema);
  const body = await parseBody(event, createMaterialRequirementSchema);
  // Inject workPackageId from route param
  const input = { ...body, workPackageId: id };
  return getServices().resourceV21.createMaterialRequirement(input, getDemoActorContext(event));
});
