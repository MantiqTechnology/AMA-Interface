import { flightScheduleTemplatesInputSchema } from '../../../../shared/features/operations/flight-schedule-templates';
import { getFlightScheduleTemplateService } from '../../../features/operations/flight-schedule-templates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'platform.module.manage');
  return getFlightScheduleTemplateService().create(
    await parseBody(event, flightScheduleTemplatesInputSchema),
    getDemoActorContext(event)
  );
});
