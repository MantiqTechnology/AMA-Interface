import { aviationOperationsDashboardQuerySchema } from '../../../shared/contracts/aviation-dashboard';
import { getDemoActorContext, requireDemoPermission } from '../../utils/auth';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'platform.dashboard.view');
  return getServices().aviationDashboard.operations(
    parseQuery(event, aviationOperationsDashboardQuerySchema),
    getDemoActorContext(event)
  );
});
