import { operationalDashboardQuerySchema } from '../../../shared/contracts/operational-dashboards';
import { getDemoStationScope, requireDemoPermission } from '../../utils/auth';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'flight.read');
  return getServices().operationalDashboards.flightControlDashboard(
    parseQuery(event, operationalDashboardQuerySchema),
    getDemoStationScope(event)
  );
});
