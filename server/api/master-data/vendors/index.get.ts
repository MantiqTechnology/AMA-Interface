import { vendorsListQuerySchema } from '../../../../shared/features/finance/vendors';
import { getVendorService } from '../../../features/finance/vendors';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getVendorService().list(parseQuery(event, vendorsListQuerySchema))
);
