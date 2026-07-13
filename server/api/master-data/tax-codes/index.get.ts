import { taxCodesListQuerySchema } from '../../../../shared/features/finance/tax-codes';
import { getTaxCodeService } from '../../../features/finance/tax-codes';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getTaxCodeService().list(parseQuery(event, taxCodesListQuerySchema))
);
