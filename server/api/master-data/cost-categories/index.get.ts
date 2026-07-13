import { costCategoriesListQuerySchema } from '../../../../shared/features/finance/cost-categories';
import { getCostCategoryService } from '../../../features/finance/cost-categories';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getCostCategoryService().list(parseQuery(event, costCategoriesListQuerySchema))
);
