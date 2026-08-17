import { listMaintenanceHandoffsQuerySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.package.read');
  return getServices().flightOperations.listMaintenance(
    parseQuery(event, listMaintenanceHandoffsQuerySchema)
  );
});
