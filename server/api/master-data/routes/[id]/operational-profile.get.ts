import { routeIdParamsSchema } from '../../../../../shared/features/operations/routes';
import { getRoutesService } from '../../../../features/operations/routes';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'master_data.read');
  return getRoutesService().getOperationalProfile(parseParams(event, routeIdParamsSchema).id);
});
