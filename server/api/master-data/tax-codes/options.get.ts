import { getTaxCodeService } from '../../../features/finance/tax-codes';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getTaxCodeService().options());
