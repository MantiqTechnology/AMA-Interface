import { resourceRequirementIdParamsSchema } from '#shared/features/maintenance-v21-schemas';
import { defineApiEventHandler } from '#server/utils/api-response';
import { requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseParams } from '#server/utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.v21.resource.read');
  const { id, requirementId } = parseParams(event, resourceRequirementIdParamsSchema);
  return getServices().resourceV21.listPersonnelCandidates(requirementId, id);
});
