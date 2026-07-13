import { taxCodesInputSchema } from '../../../../shared/features/finance/tax-codes';
import { getTaxCodeService } from '../../../features/finance/tax-codes';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getTaxCodeService().create(await parseBody(event, taxCodesInputSchema))
);
