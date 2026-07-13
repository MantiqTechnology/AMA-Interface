import { vendorsInputSchema } from '../../../../shared/features/finance/vendors';
import { getVendorService } from '../../../features/finance/vendors';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getVendorService().create(await parseBody(event, vendorsInputSchema))
);
