import { costCategoriesInputSchema } from '../../../../shared/features/finance/cost-categories';
import { getCostCategoryService } from '../../../features/finance/cost-categories';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getCostCategoryService().create(await parseBody(event, costCategoriesInputSchema))
);
