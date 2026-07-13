import {
  handlingParkingSuppliersIdParamsSchema,
  handlingParkingSuppliersStatusSchema
} from '../../../../../shared/features/finance/handling-parking-suppliers';
import { getHandlingParkingSupplierService } from '../../../../features/finance/handling-parking-suppliers';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, handlingParkingSuppliersIdParamsSchema);
  const { isActive } = await parseBody(event, handlingParkingSuppliersStatusSchema);
  return getHandlingParkingSupplierService().setActive(id, isActive);
});
