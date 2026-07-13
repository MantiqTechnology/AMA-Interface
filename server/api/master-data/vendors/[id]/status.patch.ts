import {
  vendorsIdParamsSchema,
  vendorsStatusSchema
} from '../../../../../shared/features/finance/vendors';
import { getVendorService } from '../../../../features/finance/vendors';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, vendorsIdParamsSchema);
  const { isActive } = await parseBody(event, vendorsStatusSchema);
  return getVendorService().setActive(id, isActive);
});
