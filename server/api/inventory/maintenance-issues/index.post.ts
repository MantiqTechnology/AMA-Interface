import { maintenancePartIssueInputSchema } from '../../../../shared/features/inventory';
import { getInventoryService } from '../../../features/inventory';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, getDemoStationScope, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.issue');
  const body = await parseBody(event, maintenancePartIssueInputSchema);
  if (body.targetType === 'CORPORATE_ASSET') {
    requireDemoPermission(event, 'asset.maintenance.manage');
  }
  return getInventoryService().issueMaintenanceParts(
    body,
    getDemoActorId(event),
    getDemoStationScope(event)
  );
});
