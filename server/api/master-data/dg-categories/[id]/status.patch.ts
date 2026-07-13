import {
  dgCategoriesIdParamsSchema,
  dgCategoriesStatusSchema
} from '../../../../../shared/features/cargo/dg-categories';
import { getDgCategoryService } from '../../../../features/cargo/dg-categories';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, dgCategoriesIdParamsSchema);
  const { isActive } = await parseBody(event, dgCategoriesStatusSchema);
  return getDgCategoryService().setActive(id, isActive);
});
