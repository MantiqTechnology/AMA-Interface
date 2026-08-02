import { employeeLoginBodySchema } from '../../../shared/contracts/auth';
import { getHrisService } from '../../features/hris';
import { defineApiEventHandler } from '../../utils/api-response';
import { setEmployeeSession } from '../../utils/auth';
import { parseBody } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const body = await parseBody(event, employeeLoginBodySchema);
  const session = getHrisService().verifyEmployeeLogin(body.employeeCode, body.pin);
  setEmployeeSession(event, session.employeeId);
  return session;
});
