import { z } from 'zod';
import { idParamSchema } from '../../../../shared/contracts/common';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseParams, parseBody } from '../../../utils/validation';

const attachReceiptSchema = z.object({
  receiptPath: z.string().min(1)
});

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  const body = await parseBody(event, attachReceiptSchema);
  return await getServices().stationExpenses.attachReceipt(id, body.receiptPath);
});
