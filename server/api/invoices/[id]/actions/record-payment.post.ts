import { idParamSchema } from '../../../../../shared/contracts/common';
import { recordPaymentBodySchema } from '../../../../../shared/contracts/invoices';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseParams, parseBody } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.payment.record');
  const { id } = parseParams(event, idParamSchema);
  const body = await parseBody(event, recordPaymentBodySchema);
  return await getServices().invoices.recordPayment(id, body);
});
