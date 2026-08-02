import { getHrisService } from '../../features/hris';
import { defineApiEventHandler } from '../../utils/api-response';
import { getEmployeeSessionId } from '../../utils/auth';

export default defineApiEventHandler((event) => {
  const employeeId = getEmployeeSessionId(event);
  if (!employeeId) return null;
  try {
    return getHrisService().getEmployee(employeeId);
  } catch {
    return null;
  }
});
