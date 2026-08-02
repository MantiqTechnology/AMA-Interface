import { z } from 'zod';
import { getHrisService } from '../../../../features/hris';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseQuery } from '../../../../utils/validation';

const querySchema = z.object({
  jobPostingId: z.string().trim().optional()
});

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.recruitment.manage');
  const query = parseQuery(event, querySchema);
  return getHrisService().listApplicants(query.jobPostingId);
});
