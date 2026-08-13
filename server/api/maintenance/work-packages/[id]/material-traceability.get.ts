import { maintenanceIdParamsSchema } from '#shared/features/maintenance';
import { materialTraceabilityQuerySchema } from '#shared/features/maintenance-v21-schemas';
import { defineApiEventHandler } from '#server/utils/api-response';
import { requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseParams, parseQuery } from '#server/utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.v21.resource.read');
  const { id } = parseParams(event, maintenanceIdParamsSchema);
  const query = parseQuery(event, materialTraceabilityQuerySchema);
  return getServices().resourceV21.listMaterialTraceability(id, query.materialRequirementId);
});
