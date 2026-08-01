import { getHrisService } from '../../../features/hris';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireEmployeeAuth } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  const employeeId = requireEmployeeAuth(event);
  const emp = getHrisService().getEmployee(employeeId);
  const runs = getHrisService().listPayrollRuns();
  const allPayslips = [];
  for (const run of runs) {
    if (run.status === 'APPROVED' || run.status === 'PAID') {
      const payslips = getHrisService().listPayslips(run.id);
      const match = payslips.find((p) => p.employeeId === emp.id);
      if (match) {
        allPayslips.push({
          ...match,
          periodMonth: run.periodMonth,
          periodYear: run.periodYear,
          runNumber: run.runNumber
        });
      }
    }
  }
  return allPayslips;
});
