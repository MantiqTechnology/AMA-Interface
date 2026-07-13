import { getRoutesService } from '../../../features/operations/routes';
import { defineApiEventHandler } from '../../../utils/api-response';

export default defineApiEventHandler(() => getRoutesService().options());
