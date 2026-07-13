import {
  flightScheduleTemplatesIdParamsSchema,
  flightScheduleTemplatesStatusSchema
} from '../../../../../shared/features/operations/flight-schedule-templates';
import { getFlightScheduleTemplateService } from '../../../../features/operations/flight-schedule-templates';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, flightScheduleTemplatesIdParamsSchema);
  const { isActive } = await parseBody(event, flightScheduleTemplatesStatusSchema);
  return getFlightScheduleTemplateService().setActive(id, isActive);
});
