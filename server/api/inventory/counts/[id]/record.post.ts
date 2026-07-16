import {
  inventoryCountLineInputSchema,
  inventoryIdParamsSchema
} from '../../../../../shared/features/inventory';
import { getInventoryService } from '../../../../features/inventory';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoStationScope, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.count');
  const { id } = parseParams(event, inventoryIdParamsSchema);
  return getInventoryService().recordCount(
    id,
    await parseBody(event, inventoryCountLineInputSchema),
    getDemoStationScope(event)
  );
});
