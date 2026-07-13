import { handlingParkingSuppliersIdParamsSchema } from '../../../../shared/features/finance/handling-parking-suppliers';
import { getHandlingParkingSupplierService } from '../../../features/finance/handling-parking-suppliers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getHandlingParkingSupplierService().get(
    parseParams(event, handlingParkingSuppliersIdParamsSchema).id
  )
);
