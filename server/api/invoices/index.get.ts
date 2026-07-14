import { invoiceListQuerySchema } from '../../../shared/features/finance/invoices';
import { requireDemoPermission } from '../../utils/auth';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.invoice.read');
  const query = parseQuery(event, invoiceListQuerySchema);
  return getServices().invoices.list(query);
});
