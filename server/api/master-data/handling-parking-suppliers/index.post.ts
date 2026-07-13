import { handlingParkingSuppliersInputSchema } from '../../../../shared/features/finance/handling-parking-suppliers';
import { getHandlingParkingSupplierService } from '../../../features/finance/handling-parking-suppliers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getHandlingParkingSupplierService().create(
    await parseBody(event, handlingParkingSuppliersInputSchema)
  )
);
