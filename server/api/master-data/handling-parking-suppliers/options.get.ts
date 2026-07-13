import { getHandlingParkingSupplierService } from '../../../features/finance/handling-parking-suppliers';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getHandlingParkingSupplierService().options());
