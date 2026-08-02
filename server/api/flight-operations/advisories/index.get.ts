import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'readiness.view');
  return getServices().flightOperations.listOperationalAdvisories();
});
