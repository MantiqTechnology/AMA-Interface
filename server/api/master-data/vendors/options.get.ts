import { getVendorService } from '../../../features/finance/vendors';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getVendorService().options());
