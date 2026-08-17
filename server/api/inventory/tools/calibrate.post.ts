import { inventoryToolCalibrateSchema } from '../../../../shared/features/inventory';
import { getInventoryService } from '../../../features/inventory';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoStationScope, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.tool.manage');
  const body = await parseBody(event, inventoryToolCalibrateSchema);
  return getInventoryService().calibrateTool(body, getDemoStationScope(event));
});
