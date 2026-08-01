import { flightScheduleTemplatesIdParamsSchema } from '../../../../../shared/features/operations/flight-schedule-templates';
import { getFlightScheduleTemplateService } from '../../../../features/operations/flight-schedule-templates';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'platform.module.manage');
  const { id } = parseParams(event, flightScheduleTemplatesIdParamsSchema);
  return getFlightScheduleTemplateService().archive(id, getDemoActorContext(event));
});
