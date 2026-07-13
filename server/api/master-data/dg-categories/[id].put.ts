import {
  dgCategoriesIdParamsSchema,
  dgCategoriesInputSchema
} from '../../../../shared/features/cargo/dg-categories';
import { getDgCategoryService } from '../../../features/cargo/dg-categories';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, dgCategoriesIdParamsSchema);
  return getDgCategoryService().update(id, await parseBody(event, dgCategoriesInputSchema));
});
