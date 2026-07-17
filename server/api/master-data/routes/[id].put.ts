import {
  routeIdParamsSchema,
  routeInputSchema
} from '../../../../shared/features/operations/routes';
import { getRoutesService } from '../../../features/operations/routes';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';
import { requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'master_data.manage');
  const { id } = parseParams(event, routeIdParamsSchema);
  return getRoutesService().update(id, await parseBody(event, routeInputSchema));
});
