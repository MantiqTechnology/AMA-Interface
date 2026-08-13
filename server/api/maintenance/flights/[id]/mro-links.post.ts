import { maintenanceIdParamsSchema } from '#shared/features/maintenance';
import { linkFlightMroSchema } from '#shared/features/maintenance-v21-schemas';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'maintenance.v21.resource.write');
  const { id } = parseParams(event, maintenanceIdParamsSchema);
  const body = await parseBody(event, linkFlightMroSchema);
  // Inject flightOrderId from route param
  const input = { ...body, flightOrderId: id };
  return getServices().resourceV21.linkFlightMro(input, getDemoActorContext(event));
});
