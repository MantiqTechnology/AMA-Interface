import {
  routeIdParamsSchema,
  routeStatusSchema
} from '../../../../../shared/features/operations/routes';
import { getRoutesService } from '../../../../features/operations/routes';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, routeIdParamsSchema);
  const { isActive } = await parseBody(event, routeStatusSchema);
  return getRoutesService().setActive(id, isActive);
});
