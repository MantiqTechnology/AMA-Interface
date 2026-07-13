import { getFlightScheduleTemplateService } from '../../../features/operations/flight-schedule-templates';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getFlightScheduleTemplateService().options());
