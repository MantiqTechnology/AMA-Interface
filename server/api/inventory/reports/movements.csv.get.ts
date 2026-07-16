import { setHeader } from 'h3';
import { inventoryListQuerySchema } from '../../../../shared/features/inventory';
import { getInventoryService } from '../../../features/inventory';
import { getDemoStationScope, hasDemoPermission, requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';

export default defineEventHandler((event) => {
  requireDemoPermission(event, 'inventory.read');
  const csv = getInventoryService().movementCsv(
    parseQuery(event, inventoryListQuerySchema),
    getDemoStationScope(event),
    hasDemoPermission(event, 'inventory.valuation.read')
  );
  setHeader(event, 'content-type', 'text/csv; charset=utf-8');
  setHeader(event, 'content-disposition', 'attachment; filename="inventory-movements.csv"');
  return csv;
});
