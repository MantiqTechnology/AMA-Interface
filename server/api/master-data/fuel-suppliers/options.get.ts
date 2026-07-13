import { getFuelSupplierService } from '../../../features/finance/fuel-suppliers';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getFuelSupplierService().options());
