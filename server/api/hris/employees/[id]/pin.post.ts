import { employeeSetPinSchema } from '../../../../../shared/features/hris';
import { getHrisService } from '../../../../features/hris';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseBody } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'hris.employee.manage');
  const id = event.context.params?.id as string;
  const body = await parseBody(event, employeeSetPinSchema);
  return getHrisService().setEmployeePin(id, body.pin);
});
