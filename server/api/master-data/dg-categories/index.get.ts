import { dgCategoriesListQuerySchema } from '../../../../shared/features/cargo/dg-categories';
import { getDgCategoryService } from '../../../features/cargo/dg-categories';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getDgCategoryService().list(parseQuery(event, dgCategoriesListQuerySchema))
);
