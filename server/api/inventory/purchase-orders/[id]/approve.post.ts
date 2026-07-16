import { inventoryIdParamsSchema } from '../../../../../shared/features/inventory';
import { getInventoryService } from '../../../../features/inventory';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoStationScope, requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'inventory.po.approve');
  const { id } = parseParams(event, inventoryIdParamsSchema);
  return getInventoryService().approvePurchaseOrder(
    id,
    getDemoActorId(event),
    getDemoStationScope(event)
  );
});
