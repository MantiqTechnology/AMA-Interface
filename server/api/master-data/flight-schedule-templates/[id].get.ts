import { flightScheduleTemplatesIdParamsSchema } from '../../../../shared/features/operations/flight-schedule-templates';
import { getFlightScheduleTemplateService } from '../../../features/operations/flight-schedule-templates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getFlightScheduleTemplateService().get(
    parseParams(event, flightScheduleTemplatesIdParamsSchema).id
  )
);
