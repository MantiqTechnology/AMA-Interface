import { z } from 'zod';
import { defineApiEventHandler } from '#server/utils/api-response';
import { requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseParams } from '#server/utils/validation';

const paramsSchema = z.object({
  id: z.string().trim().min(1),
  requirementId: z.string().trim().min(1)
});

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.package.read');
  const { id, requirementId } = parseParams(event, paramsSchema);
  return getServices().maintenance.listGseCandidates(id, requirementId);
});
