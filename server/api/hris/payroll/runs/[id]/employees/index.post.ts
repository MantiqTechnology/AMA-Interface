import { z } from 'zod';
import { getHrisService } from '../../../../../../features/hris';
import { defineApiEventHandler } from '../../../../../../utils/api-response';
import { requireDemoPermission } from '../../../../../../utils/auth';
import { parseBody } from '../../../../../../utils/validation';

const addEmployeesSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1)
});

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'hris.payroll.manage');
  const runId = event.context.params?.id as string;
  const body = await parseBody(event, addEmployeesSchema);
  return getHrisService().addEmployeesToPayrollRun(runId, body.employeeIds);
});
