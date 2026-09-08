import { aviationManagementDashboardQuerySchema } from '../../../shared/contracts/aviation-dashboard';
import { getDemoStationScope, requireDemoPermission } from '../../utils/auth';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'platform.dashboard.view');
  requireDemoPermission(event, 'finance.accounting.read');
  return getServices().aviationDashboard.management(
    parseQuery(event, aviationManagementDashboardQuerySchema),
    getDemoStationScope(event)
  );
});
