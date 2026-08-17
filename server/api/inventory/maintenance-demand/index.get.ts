import { inventoryMaintenanceDemandQuerySchema } from '#shared/features/inventory';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoStationScope, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { getValidatedQuery } from 'h3';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.maintenance_demand.read');
  const query = await getValidatedQuery(event, inventoryMaintenanceDemandQuerySchema.parse);
  return getServices().resourceV21.listMaintenanceDemand(query, getDemoStationScope(event));
});
