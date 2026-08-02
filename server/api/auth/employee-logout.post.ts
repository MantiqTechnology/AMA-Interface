import { defineApiEventHandler } from '../../utils/api-response';
import { clearEmployeeSession } from '../../utils/auth';

export default defineApiEventHandler((event) => {
  clearEmployeeSession(event);
  return { success: true };
});
