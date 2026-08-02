import { z } from 'zod';
import { getHrisService } from '../../../features/hris';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';

const querySchema = z.object({
  date: z.string().date().optional()
});

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.schedule.read');
  const query = parseQuery(event, querySchema);
  return getHrisService().getFlightRoster(query.date);
});
