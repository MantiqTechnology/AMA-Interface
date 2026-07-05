import { listFuelRequestsQuerySchema } from '../../../../shared/contracts/fuel';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const query = parseQuery(event, listFuelRequestsQuerySchema);
  return await getServices().fuel.listRequests(query);
});
