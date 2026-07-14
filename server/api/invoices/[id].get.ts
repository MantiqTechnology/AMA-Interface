import { invoiceIdParamsSchema } from '../../../shared/features/finance/invoices';
import { requireDemoPermission } from '../../utils/auth';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseParams } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.invoice.read');
  const { id } = parseParams(event, invoiceIdParamsSchema);
  return getServices().invoices.get(id);
});
