import { createStationExpenseBodySchema } from '../../../shared/contracts/station-expenses';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseBody } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const body = await parseBody(event, createStationExpenseBodySchema);
  return await getServices().stationExpenses.createExpense(body);
});
