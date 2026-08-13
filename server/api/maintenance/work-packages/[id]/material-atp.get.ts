import { maintenanceIdParamsSchema } from '#shared/features/maintenance';
import { atpQuerySchema } from '#shared/features/maintenance-v21-schemas';
import { defineApiEventHandler } from '#server/utils/api-response';
import { requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseParams, parseQuery } from '#server/utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.v21.resource.read');
  parseParams(event, maintenanceIdParamsSchema);
  const query = parseQuery(event, atpQuerySchema);
  return getServices().resourceV21.calculateAtp(query.partId, query.stationId);
});
