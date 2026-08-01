import { getHrisService } from '../../../../../features/hris';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { requireDemoPermission } from '../../../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.payroll.calculate');
  const id = event.context.params?.id as string;
  return getHrisService().calculatePayrollRun(id);
});
