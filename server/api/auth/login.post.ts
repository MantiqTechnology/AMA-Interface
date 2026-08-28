import { demoLoginBodySchema } from '../../../shared/contracts/auth';
import { defineApiEventHandler } from '../../utils/api-response';
import { authenticateDemoAccount } from '../../utils/demo-accounts';
import {
  assertDemoLoginAllowed,
  clearDemoLoginFailures,
  recordDemoLoginFailure
} from '../../utils/demo-login-rate-limit';
import { requireExplicitDemoRuntime, setDemoSession } from '../../utils/auth';
import { toDemoSessionDto } from '../../utils/demo-session';
import { DomainError } from '../../utils/errors';
import { parseBody } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireExplicitDemoRuntime('Demo sign-in');
  const body = await parseBody(event, demoLoginBodySchema);
  assertDemoLoginAllowed(event, body.username);
  const account = authenticateDemoAccount(body.username, body.password);
  if (!account) {
    recordDemoLoginFailure(event, body.username);
    throw new DomainError('INVALID_CREDENTIALS', 'Username or password is incorrect.', 401);
  }
  clearDemoLoginFailures(event, body.username);
  return toDemoSessionDto(setDemoSession(event, account));
});
