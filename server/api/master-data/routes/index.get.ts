import { routeListQuerySchema } from '../../../../shared/features/operations/routes';
import { getRoutesService } from '../../../features/operations/routes';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) =>
  getRoutesService().list(parseQuery(event, routeListQuerySchema))
);
