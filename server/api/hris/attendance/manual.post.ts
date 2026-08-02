import { attendanceManualSchema } from '../../../../shared/features/hris';
import { getHrisService } from '../../../features/hris';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'hris.attendance.manage');
  const body = await parseBody(event, attendanceManualSchema);
  return getHrisService().recordManualAttendance(body);
});
