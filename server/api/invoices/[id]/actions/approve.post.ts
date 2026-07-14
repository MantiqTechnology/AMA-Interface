import {
  approveInvoiceBodySchema,
  invoiceIdParamsSchema
} from '../../../../../shared/features/finance/invoices';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.invoice.approve');
  const { id } = parseParams(event, invoiceIdParamsSchema);
  await parseBody(event, approveInvoiceBodySchema);
  return getServices().invoices.approve(id, getDemoActorId(event));
});
