import { listStationExpensesQuerySchema } from '../../../shared/contracts/station-expenses';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const query = parseQuery(event, listStationExpensesQuerySchema);
  return await getServices().stationExpenses.listExpenses(query);
});
