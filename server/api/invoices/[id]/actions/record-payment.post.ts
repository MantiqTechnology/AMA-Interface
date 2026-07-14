import {
  invoiceIdParamsSchema,
  recordPaymentBodySchema
} from '../../../../../shared/features/finance/invoices';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseParams, parseBody } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.payment.record');
  const { id } = parseParams(event, invoiceIdParamsSchema);
  const body = await parseBody(event, recordPaymentBodySchema);
  return await getServices().invoices.recordPayment(id, body);
});
