import { getFlightScheduleTemplateService } from '../../../features/operations/flight-schedule-templates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'master_data.read');
  return getFlightScheduleTemplateService().options();
});
