import { attendanceListQuerySchema } from '../../../../shared/features/hris';
import { getHrisService } from '../../../features/hris';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.attendance.read');
  const query = parseQuery(event, attendanceListQuerySchema);
  return getHrisService().listAttendance(query);
});
