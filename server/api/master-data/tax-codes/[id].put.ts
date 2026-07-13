import {
  taxCodesIdParamsSchema,
  taxCodesInputSchema
} from '../../../../shared/features/finance/tax-codes';
import { getTaxCodeService } from '../../../features/finance/tax-codes';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, taxCodesIdParamsSchema);
  return getTaxCodeService().update(id, await parseBody(event, taxCodesInputSchema));
});
