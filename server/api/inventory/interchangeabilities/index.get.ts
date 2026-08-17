import { getInventoryService } from '../../../features/inventory';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'inventory.read');
  const query = getQuery(event);
  const partId = typeof query.partId === 'string' ? query.partId : undefined;
  return getInventoryService().listInterchangeabilities(partId);
});
