import { inventoryToolCheckoutSchema } from '../../../../shared/features/inventory';
import { getInventoryService } from '../../../features/inventory';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.write');
  const userId = getDemoActorId(event);
  const body = await parseBody(event, inventoryToolCheckoutSchema);
  return getInventoryService().checkoutTool({ ...body, userId });
});
