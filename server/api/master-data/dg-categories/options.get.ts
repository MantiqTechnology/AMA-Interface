import { getDgCategoryService } from '../../../features/cargo/dg-categories';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getDgCategoryService().options());
