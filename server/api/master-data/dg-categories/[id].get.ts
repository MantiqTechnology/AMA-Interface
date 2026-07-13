import { dgCategoriesIdParamsSchema } from '../../../../shared/features/cargo/dg-categories';
import { getDgCategoryService } from '../../../features/cargo/dg-categories';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getDgCategoryService().get(parseParams(event, dgCategoriesIdParamsSchema).id)
);
