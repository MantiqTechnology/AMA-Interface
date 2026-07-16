import {
  inventoryIdParamsSchema,
  inventoryPartInputSchema
} from '../../../../shared/features/inventory';
import { getInventoryService } from '../../../features/inventory';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseBody, parseParams } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'inventory.catalog.manage');
  const { id } = parseParams(event, inventoryIdParamsSchema);
  return getInventoryService().updatePart(id, await parseBody(event, inventoryPartInputSchema));
});
