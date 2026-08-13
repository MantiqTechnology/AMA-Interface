import { maintenanceFacilityOccupancyQuerySchema } from '#shared/features/maintenance';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseQuery } from '#server/utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.package.read');
  const query = parseQuery(event, maintenanceFacilityOccupancyQuerySchema);
  return getServices().maintenance.listMaintenanceOccupancy(query, getDemoActorContext(event));
});
