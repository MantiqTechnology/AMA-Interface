import { fuelSuppliersListQuerySchema } from '../../../../shared/features/finance/fuel-suppliers';
import { getFuelSupplierService } from '../../../features/finance/fuel-suppliers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getFuelSupplierService().list(parseQuery(event, fuelSuppliersListQuerySchema))
);
