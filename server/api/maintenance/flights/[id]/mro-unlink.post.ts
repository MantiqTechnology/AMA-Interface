import { maintenanceIdParamsSchema } from '#shared/features/maintenance';
import { unlinkFlightMroSchema } from '#shared/features/maintenance-v21-schemas';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'maintenance.v21.resource.write');
  parseParams(event, maintenanceIdParamsSchema);
  const body = await parseBody(event, unlinkFlightMroSchema);
  return getServices().resourceV21.unlinkFlightMro(body, getDemoActorContext(event));
});
