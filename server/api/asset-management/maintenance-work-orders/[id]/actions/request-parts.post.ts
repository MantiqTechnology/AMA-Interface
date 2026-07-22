import { getRouterParam } from 'h3';
import { maintenancePartRequestSchema } from '../../../../../../shared/features/corporate-assets';
import { getCorporateAssetService } from '../../../../../features/corporate-assets';
import { getInventoryService } from '../../../../../features/inventory';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import {
  getDemoActorId,
  getDemoStationScope,
  requireDemoPermission
} from '../../../../../utils/auth';
import { parseBody } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'asset.maintenance.manage');
  requireDemoPermission(event, 'inventory.issue');
  const id = getRouterParam(event, 'id')!;
  const body = await parseBody(event, maintenancePartRequestSchema);
  const workOrder = getCorporateAssetService().requireWorkOrder(id);
  return getInventoryService().issueMaintenanceParts(
    {
      targetType: 'CORPORATE_ASSET',
      targetId: String(workOrder.asset_id),
      assetMaintenanceWorkOrderId: id,
      expectedAssetVersion: body.expectedVersion,
      maintenanceHandoffId: null,
      aircraftId: null,
      flightId: null,
      warehouseId: body.warehouseId,
      reason: body.reason,
      lines: body.lines
    },
    getDemoActorId(event),
    getDemoStationScope(event)
  );
});
