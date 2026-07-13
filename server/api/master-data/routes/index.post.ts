import { routeInputSchema } from '../../../../shared/features/operations/routes';
import { getRoutesService } from '../../../features/operations/routes';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) =>
  getRoutesService().create(await parseBody(event, routeInputSchema))
);
