import { z } from 'zod';
import { getHrisService } from '../../../features/hris';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';

const querySchema = z.object({
  employeeId: z.string().trim().min(1),
  year: z.coerce.number().int().default(new Date().getFullYear())
});

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.leave.read');
  const query = parseQuery(event, querySchema);
  return getHrisService().getLeaveBalance(query.employeeId, query.year);
});
