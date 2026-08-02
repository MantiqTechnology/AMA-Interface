import { getHrisService } from '../../../features/hris';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireEmployeeAuth } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  const employeeId = requireEmployeeAuth(event);
  const currentYear = new Date().getFullYear();
  return getHrisService().getLeaveBalance(employeeId, currentYear);
});
