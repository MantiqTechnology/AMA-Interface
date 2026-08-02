import { payrollRunQuerySchema } from '../../../../../shared/features/hris';
import { getHrisService } from '../../../../features/hris';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseQuery } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  const query = parseQuery(event, payrollRunQuerySchema);
  return getHrisService().listPayrollRuns(query);
});
