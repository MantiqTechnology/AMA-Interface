import { taxCodesIdParamsSchema } from '../../../../shared/features/finance/tax-codes';
import { getTaxCodeService } from '../../../features/finance/tax-codes';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getTaxCodeService().get(parseParams(event, taxCodesIdParamsSchema).id)
);
