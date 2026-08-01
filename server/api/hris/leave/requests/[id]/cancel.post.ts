import { getHrisService } from '../../../../../features/hris';
import { defineApiEventHandler } from '../../../../../utils/api-response';

export default defineApiEventHandler((event) => {
  const id = event.context.params?.id as string;
  return getHrisService().cancelLeaveRequest(id);
});
