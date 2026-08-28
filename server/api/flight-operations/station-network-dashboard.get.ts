import { operationalDashboardQuerySchema } from '../../../shared/contracts/operational-dashboards';
import { defineApiEventHandler } from '../../utils/api-response';
import { requireDemoPermission } from '../../utils/auth';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'station.network_dashboard.view');
  return getServices().operationalDashboards.stationNetworkDashboard(
    parseQuery(event, operationalDashboardQuerySchema)
  );
});
