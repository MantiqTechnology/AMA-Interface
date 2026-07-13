import { handlingParkingSuppliersListQuerySchema } from '../../../../shared/features/finance/handling-parking-suppliers';
import { getHandlingParkingSupplierService } from '../../../features/finance/handling-parking-suppliers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getHandlingParkingSupplierService().list(
    parseQuery(event, handlingParkingSuppliersListQuerySchema)
  )
);
