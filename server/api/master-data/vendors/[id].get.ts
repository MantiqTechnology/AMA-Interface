import { vendorsIdParamsSchema } from '../../../../shared/features/finance/vendors';
import { getVendorService } from '../../../features/finance/vendors';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getVendorService().get(parseParams(event, vendorsIdParamsSchema).id)
);
