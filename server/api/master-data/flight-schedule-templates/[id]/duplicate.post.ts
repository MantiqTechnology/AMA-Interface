import {
  duplicateScheduleTemplateSchema,
  flightScheduleTemplatesIdParamsSchema
} from '../../../../../shared/features/operations/flight-schedule-templates';
import { getFlightScheduleTemplateService } from '../../../../features/operations/flight-schedule-templates';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'platform.module.manage');
  const { id } = parseParams(event, flightScheduleTemplatesIdParamsSchema);
  return getFlightScheduleTemplateService().duplicate(
    id,
    await parseBody(event, duplicateScheduleTemplateSchema),
    getDemoActorContext(event)
  );
});
