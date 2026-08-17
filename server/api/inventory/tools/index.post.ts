import { inventoryToolInputSchema } from '../../../../shared/features/inventory';
import { getInventoryService } from '../../../features/inventory';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoStationScope, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.tool.manage');
  const body = await parseBody(event, inventoryToolInputSchema);
  return getInventoryService().createTool(body, getDemoStationScope(event));
});
