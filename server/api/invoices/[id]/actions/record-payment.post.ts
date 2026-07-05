import { idParamSchema } from '../../../../../shared/contracts/common';
import { recordPaymentBodySchema } from '../../../../../shared/contracts/invoices';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getServices } from '../../../../utils/services';
import { parseParams, parseBody } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  const body = await parseBody(event, recordPaymentBodySchema);
  return await getServices().invoices.recordPayment(id, body);
});
