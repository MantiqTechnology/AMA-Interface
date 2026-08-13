import {
  createNonRoutineFindingSchema,
  maintenanceIdParamsSchema
} from '#shared/features/maintenance';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'maintenance.jobcard.work.sign');
  const { id } = parseParams(event, maintenanceIdParamsSchema);
  const body = await parseBody(event, createNonRoutineFindingSchema);
  return getServices().maintenance.createNonRoutineFinding(id, body, getDemoActorContext(event));
});
