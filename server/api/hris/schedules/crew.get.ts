import { crewScheduleListQuerySchema } from '../../../../shared/features/hris';
import { getHrisService } from '../../../features/hris';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.schedule.read');
  const query = parseQuery(event, crewScheduleListQuerySchema);
  return getHrisService().listCrewSchedules(query);
});
