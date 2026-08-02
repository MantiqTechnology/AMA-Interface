import { attendanceCheckOutSchema } from '../../../../shared/features/hris';
import { getHrisService } from '../../../features/hris';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireEmployeeAuth } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const employeeId = requireEmployeeAuth(event);
  const body = await parseBody(event, attendanceCheckOutSchema);
  return getHrisService().checkOut(employeeId, body);
});
