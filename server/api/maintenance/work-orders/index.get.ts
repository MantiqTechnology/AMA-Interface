import { listWorkOrdersQuerySchema } from '../../../../shared/contracts/maintenance';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const query = parseQuery(event, listWorkOrdersQuerySchema);
  return await getServices().maintenance.listWorkOrders(query);
});
