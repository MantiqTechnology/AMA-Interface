import { supplierInvoiceBodySchema } from '../../../../shared/features/finance/transactions';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.payment.record');
  return getServices().financeTransactions.createSupplierInvoice({
    ...(await parseBody(event, supplierInvoiceBodySchema)),
    createdBy: getDemoActorId(event)
  });
});
