import { getHrisService } from '../../../../../features/hris';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.leave.approve');
  const id = event.context.params?.id as string;
  const actorId = getDemoActorId(event);
  return getHrisService().approveLeaveRequest(id, actorId);
});
