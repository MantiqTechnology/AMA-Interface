import { getHrisService } from '../../../features/hris';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireEmployeeAuth } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  const employeeId = requireEmployeeAuth(event);
  return getHrisService().listLeaveRequests({ employeeId });
});
