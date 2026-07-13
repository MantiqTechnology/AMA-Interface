import { flightScheduleTemplatesListQuerySchema } from '../../../../shared/features/operations/flight-schedule-templates';
import { getFlightScheduleTemplateService } from '../../../features/operations/flight-schedule-templates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getFlightScheduleTemplateService().list(parseQuery(event, flightScheduleTemplatesListQuerySchema))
);
