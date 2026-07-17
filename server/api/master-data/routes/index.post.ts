import { routeInputSchema } from '../../../../shared/features/operations/routes';
import { getRoutesService } from '../../../features/operations/routes';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
import { requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'master_data.manage');
  return getRoutesService().create(await parseBody(event, routeInputSchema));
});
