import { listInvoicesQuerySchema } from '../../../shared/contracts/invoices';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const query = parseQuery(event, listInvoicesQuerySchema);
  return await getServices().invoices.listInvoices(query);
});
