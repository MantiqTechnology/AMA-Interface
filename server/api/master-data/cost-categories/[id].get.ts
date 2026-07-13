import { costCategoriesIdParamsSchema } from '../../../../shared/features/finance/cost-categories';
import { getCostCategoryService } from '../../../features/finance/cost-categories';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getCostCategoryService().get(parseParams(event, costCategoriesIdParamsSchema).id)
);
