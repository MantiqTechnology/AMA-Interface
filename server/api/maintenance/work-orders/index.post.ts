import { createWorkOrderBodySchema } from '../../../../shared/contracts/maintenance';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const body = await parseBody(event, createWorkOrderBodySchema);
  return await getServices().maintenance.createWorkOrder(body);
});
