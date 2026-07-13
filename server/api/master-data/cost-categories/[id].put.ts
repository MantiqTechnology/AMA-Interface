import {
  costCategoriesIdParamsSchema,
  costCategoriesInputSchema
} from '../../../../shared/features/finance/cost-categories';
import { getCostCategoryService } from '../../../features/finance/cost-categories';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, costCategoriesIdParamsSchema);
  return getCostCategoryService().update(id, await parseBody(event, costCategoriesInputSchema));
});
