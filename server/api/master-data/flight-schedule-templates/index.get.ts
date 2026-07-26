import { flightScheduleTemplatesListQuerySchema } from '../../../../shared/features/operations/flight-schedule-templates';
import { getFlightScheduleTemplateService } from '../../../features/operations/flight-schedule-templates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'master_data.read');
  return getFlightScheduleTemplateService().list(
    parseQuery(event, flightScheduleTemplatesListQuerySchema)
  );
});
