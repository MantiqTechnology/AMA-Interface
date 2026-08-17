import { getInventoryService } from '../../../../features/inventory';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.write');
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  return getInventoryService().updateCoreReturnStatus(id, body.status, body.notes);
});
