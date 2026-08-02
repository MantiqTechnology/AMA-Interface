import {
  maintenanceDefectAssessmentSchema,
  maintenanceIdParamsSchema
} from '#shared/features/maintenance';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'maintenance.defect.assess');
  const { id } = parseParams(event, maintenanceIdParamsSchema);
  const body = await parseBody(event, maintenanceDefectAssessmentSchema);
  return getServices().maintenance.assessDefect(id, body, getDemoActorContext(event));
});
