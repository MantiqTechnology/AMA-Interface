import { inventoryListQuerySchema } from '../../../../shared/features/inventory';
import { getInventoryService } from '../../../features/inventory';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoStationScope, requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'inventory.read');
  return getInventoryService().listCounts(
    parseQuery(event, inventoryListQuerySchema),
    getDemoStationScope(event)
  );
});
