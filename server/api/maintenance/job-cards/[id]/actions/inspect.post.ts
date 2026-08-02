import {
  maintenanceIdParamsSchema,
  maintenanceIndependentInspectionSchema
} from '#shared/features/maintenance';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'maintenance.jobcard.inspect');
  const { id } = parseParams(event, maintenanceIdParamsSchema);
  const body = await parseBody(event, maintenanceIndependentInspectionSchema);
  return getServices().maintenance.inspectJobCard(id, body, getDemoActorContext(event));
});
