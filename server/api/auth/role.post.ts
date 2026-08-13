import { switchRoleBodySchema } from '../../../shared/contracts/auth';
import { defineApiEventHandler } from '../../utils/api-response';
import { getDemoRole, requireExplicitDemoRuntime, setDemoRole } from '../../utils/auth';
import { parseBody } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireExplicitDemoRuntime('Demo role switch');
  const body = await parseBody(event, switchRoleBodySchema);
  setDemoRole(event, body.role);

  return {
    role: getDemoRole(event),
    demoMode: String(useRuntimeConfig().demoMode) === 'true'
  };
});
