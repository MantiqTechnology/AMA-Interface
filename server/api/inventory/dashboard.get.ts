import { getInventoryService } from '../../features/inventory';
import { defineApiEventHandler } from '../../utils/api-response';
import { getDemoStationScope, hasDemoPermission, requireDemoPermission } from '../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'inventory.read');
  return getInventoryService().dashboard(
    getDemoStationScope(event),
    hasDemoPermission(event, 'inventory.valuation.read')
  );
});
