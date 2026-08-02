import { maintenanceListQuerySchema } from '#shared/features/maintenance';
import { defineApiEventHandler } from '#server/utils/api-response';
import { requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseQuery } from '#server/utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.package.read');
  const query = parseQuery(event, maintenanceListQuerySchema);
  return getServices().maintenance.listWorkPackages(query);
});
