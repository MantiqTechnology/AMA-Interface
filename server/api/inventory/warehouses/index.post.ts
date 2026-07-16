import { inventoryWarehouseInputSchema } from '../../../../shared/features/inventory';
import { getInventoryService } from '../../../features/inventory';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoStationScope, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.catalog.manage');
  return getInventoryService().createWarehouse(
    await parseBody(event, inventoryWarehouseInputSchema),
    getDemoStationScope(event)
  );
});
