import { z } from 'zod';
import { getHrisService } from '../../../../features/hris';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseQuery } from '../../../../utils/validation';

const querySchema = z.object({
  periodId: z.string().trim().optional(),
  employeeId: z.string().trim().optional()
});

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.kpi.read');
  const query = parseQuery(event, querySchema);
  return getHrisService().listKpiAssessments(query.periodId, query.employeeId);
});
