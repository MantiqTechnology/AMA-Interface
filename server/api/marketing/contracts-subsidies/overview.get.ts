import { getContractsSubsidiesService } from '../../../features/marketing/contracts-subsidies';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'commercial.contract.read');
  return getContractsSubsidiesService().overview();
});
