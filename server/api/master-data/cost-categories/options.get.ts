import { getCostCategoryService } from '../../../features/finance/cost-categories';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getCostCategoryService().options());
