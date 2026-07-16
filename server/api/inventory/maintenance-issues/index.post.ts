import { maintenancePartIssueInputSchema } from '../../../../shared/features/inventory';
import { getInventoryService } from '../../../features/inventory';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, getDemoStationScope, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.issue');
  return getInventoryService().issueMaintenanceParts(
    await parseBody(event, maintenancePartIssueInputSchema),
    getDemoActorId(event),
    getDemoStationScope(event)
  );
});
