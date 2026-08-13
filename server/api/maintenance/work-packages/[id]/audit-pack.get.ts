import { maintenanceIdParamsSchema } from '#shared/features/maintenance';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseParams } from '#server/utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.audit_pack.export');
  const { id } = parseParams(event, maintenanceIdParamsSchema);
  return getServices().maintenance.getAuditPack(id, getDemoActorContext(event));
});
