import { getHrisService } from '../../../../../../features/hris';
import { defineApiEventHandler } from '../../../../../../utils/api-response';
import { requireDemoPermission } from '../../../../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.payroll.manage');
  const runId = event.context.params?.id as string;
  const employeeId = event.context.params?.employeeId as string;
  return getHrisService().removeEmployeeFromPayrollRun(runId, employeeId);
});
