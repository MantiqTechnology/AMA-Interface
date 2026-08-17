import { inventoryQuarantineReleaseSchema } from '../../../../shared/features/inventory';
import { getInventoryService } from '../../../features/inventory';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, getDemoStationScope, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.quarantine.release');
  const userId = getDemoActorId(event);
  const body = await parseBody(event, inventoryQuarantineReleaseSchema);
  return getInventoryService().releaseQuarantineItem(body, userId, getDemoStationScope(event));
});
