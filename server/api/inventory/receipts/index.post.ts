import { goodsReceiptInputSchema } from '../../../../shared/features/inventory';
import { getInventoryService } from '../../../features/inventory';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, getDemoStationScope, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.receive');
  return getInventoryService().postGoodsReceipt(
    await parseBody(event, goodsReceiptInputSchema),
    getDemoActorId(event),
    getDemoStationScope(event)
  );
});
