import { defineApiEventHandler } from '../../utils/api-response';
import { clearDemoSession } from '../../utils/auth';

export default defineApiEventHandler((event) => {
  clearDemoSession(event);
  return { signedOut: true };
});
