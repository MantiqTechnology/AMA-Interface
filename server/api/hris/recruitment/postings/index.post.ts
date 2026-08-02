import { jobPostingInputSchema } from '../../../../../shared/features/hris';
import { getHrisService } from '../../../../features/hris';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { parseBody } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'hris.recruitment.manage');
  const body = await parseBody(event, jobPostingInputSchema);
  const actorId = getDemoActorId(event);
  return getHrisService().createJobPosting(body, actorId);
});
