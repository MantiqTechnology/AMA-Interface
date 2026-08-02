import { z } from 'zod';
import { getHrisService } from '../../../features/hris';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';

const querySchema = z.object({
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  stationId: z.string().trim().optional()
});

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.attendance.read');
  const query = parseQuery(event, querySchema);
  return getHrisService().getAttendanceSummary(query.year, query.month, query.stationId);
});
