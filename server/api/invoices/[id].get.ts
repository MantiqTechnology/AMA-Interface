import { idParamSchema } from '../../../shared/contracts/common';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseParams } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  return await getServices().invoices.getInvoiceDetail(id);
});
