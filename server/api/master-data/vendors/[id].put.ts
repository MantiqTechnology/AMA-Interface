import {
  vendorsIdParamsSchema,
  vendorsInputSchema
} from '../../../../shared/features/finance/vendors';
import { getVendorService } from '../../../features/finance/vendors';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, vendorsIdParamsSchema);
  return getVendorService().update(id, await parseBody(event, vendorsInputSchema));
});
