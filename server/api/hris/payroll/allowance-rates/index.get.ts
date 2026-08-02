import { getHrisService } from '../../../../features/hris';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.allowance.read');
  return getHrisService().listAllowanceRates();
});
