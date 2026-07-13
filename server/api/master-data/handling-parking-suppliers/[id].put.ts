import {
  handlingParkingSuppliersIdParamsSchema,
  handlingParkingSuppliersInputSchema
} from '../../../../shared/features/finance/handling-parking-suppliers';
import { getHandlingParkingSupplierService } from '../../../features/finance/handling-parking-suppliers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, handlingParkingSuppliersIdParamsSchema);
  return getHandlingParkingSupplierService().update(
    id,
    await parseBody(event, handlingParkingSuppliersInputSchema)
  );
});
