import { flightScheduleTemplatesInputSchema } from '../../../../shared/features/operations/flight-schedule-templates';
import { getFlightScheduleTemplateService } from '../../../features/operations/flight-schedule-templates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';
export default defineApiEventHandler(async (event) =>
  getFlightScheduleTemplateService().create(
    await parseBody(event, flightScheduleTemplatesInputSchema)
  )
);
