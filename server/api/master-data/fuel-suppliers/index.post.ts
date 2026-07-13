import { fuelSuppliersInputSchema } from '../../../../shared/features/finance/fuel-suppliers';
import { getFuelSupplierService } from '../../../features/finance/fuel-suppliers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getFuelSupplierService().create(await parseBody(event, fuelSuppliersInputSchema))
);
