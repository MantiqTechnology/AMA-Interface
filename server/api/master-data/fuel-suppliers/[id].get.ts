import { fuelSuppliersIdParamsSchema } from '../../../../shared/features/finance/fuel-suppliers';
import { getFuelSupplierService } from '../../../features/finance/fuel-suppliers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getFuelSupplierService().get(parseParams(event, fuelSuppliersIdParamsSchema).id)
);
