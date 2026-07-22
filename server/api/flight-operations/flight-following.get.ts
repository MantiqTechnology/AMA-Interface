import { operationsMonitoringQuerySchema } from '../../../shared/contracts/operations-monitoring';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';
import { getDemoStationScope, requireDemoPermission } from '../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'flight.read');
  return getServices().operationsMonitoring.flightFollowing(
    parseQuery(event, operationsMonitoringQuerySchema),
    getDemoStationScope(event)
  );
});
