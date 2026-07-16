import {
  inventoryIdParamsSchema,
  rejectInventoryActionSchema
} from '../../../../../shared/features/inventory';
import { getInventoryService } from '../../../../features/inventory';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoStationScope, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.po.approve');
  const { id } = parseParams(event, inventoryIdParamsSchema);
  const { reason } = await parseBody(event, rejectInventoryActionSchema);
  return getInventoryService().rejectPurchaseOrder(
    id,
    reason,
    getDemoActorId(event),
    getDemoStationScope(event)
  );
});
