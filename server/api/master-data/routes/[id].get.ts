import { routeIdParamsSchema } from '../../../../shared/features/operations/routes';
import { getRoutesService } from '../../../features/operations/routes';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';

export default defineApiEventHandler((event) =>
  getRoutesService().get(parseParams(event, routeIdParamsSchema).id)
);
