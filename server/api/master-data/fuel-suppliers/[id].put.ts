import {
  fuelSuppliersIdParamsSchema,
  fuelSuppliersInputSchema
} from '../../../../shared/features/finance/fuel-suppliers';
import { getFuelSupplierService } from '../../../features/finance/fuel-suppliers';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, fuelSuppliersIdParamsSchema);
  return getFuelSupplierService().update(id, await parseBody(event, fuelSuppliersInputSchema));
});
