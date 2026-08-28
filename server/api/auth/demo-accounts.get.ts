import { defineApiEventHandler } from '../../utils/api-response';
import { isLoopbackRequest, requireExplicitDemoRuntime } from '../../utils/auth';
import { listDemoAccountHelpers } from '../../utils/demo-accounts';
import { DomainError } from '../../utils/errors';

export default defineApiEventHandler((event) => {
  requireExplicitDemoRuntime('Demo account helper');
  const testHarnessAllowed = process.env.AMA_ALLOW_LEGACY_TEST_ROLE_COOKIE === 'true';
  if (!isLoopbackRequest(event) && !testHarnessAllowed) {
    throw new DomainError('DEMO_ACCOUNT_HELPER_DISABLED', 'Demo account helper is disabled.', 404);
  }
  return listDemoAccountHelpers();
});
