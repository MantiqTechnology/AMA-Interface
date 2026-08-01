import { flightScheduleTemplatesIdParamsSchema } from '../../../../shared/features/operations/flight-schedule-templates';
import { getFlightScheduleTemplateService } from '../../../features/operations/flight-schedule-templates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'master_data.read');
  return getFlightScheduleTemplateService().get(
    parseParams(event, flightScheduleTemplatesIdParamsSchema).id
  );
});
