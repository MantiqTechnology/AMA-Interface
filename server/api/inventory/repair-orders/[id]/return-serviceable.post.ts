import {
  inventoryIdParamsSchema,
  returnServiceableInputSchema
} from '../../../../../shared/features/inventory';
import { getInventoryService } from '../../../../features/inventory';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, getDemoStationScope, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.repair.manage');
  const { id } = parseParams(event, inventoryIdParamsSchema);
  return getInventoryService().returnServiceable(
    id,
    await parseBody(event, returnServiceableInputSchema),
    getDemoActorId(event),
    getDemoStationScope(event)
  );
});
