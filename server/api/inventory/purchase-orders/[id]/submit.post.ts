import { inventoryIdParamsSchema } from '../../../../../shared/features/inventory';
import { getInventoryService } from '../../../../features/inventory';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoStationScope, requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'inventory.procurement.manage');
  const { id } = parseParams(event, inventoryIdParamsSchema);
  return getInventoryService().submitPurchaseOrder(id, getDemoStationScope(event));
});
