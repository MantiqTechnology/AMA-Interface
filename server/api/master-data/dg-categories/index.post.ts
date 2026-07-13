import { dgCategoriesInputSchema } from '../../../../shared/features/cargo/dg-categories';
import { getDgCategoryService } from '../../../features/cargo/dg-categories';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getDgCategoryService().create(await parseBody(event, dgCategoriesInputSchema))
);
