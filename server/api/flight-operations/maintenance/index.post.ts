import { createMaintenanceHandoffBodySchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'maintenance.handoff.update');
  const body = await parseBody(event, createMaintenanceHandoffBodySchema);
  return getServices().flightOperations.createMaintenance(body, getDemoActorId(event));
});
