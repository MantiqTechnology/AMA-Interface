import { getDemoRole } from '../../utils/auth';
import { defineApiEventHandler } from '../../utils/api-response';

export default defineApiEventHandler((event) => ({
  role: getDemoRole(event),
  demoMode: String(useRuntimeConfig().demoMode) === 'true'
}));
