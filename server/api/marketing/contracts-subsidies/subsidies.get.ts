import { contractsSubsidiesQuerySchema } from '../../../../shared/features/marketing/contracts-subsidies';
import { getContractsSubsidiesService } from '../../../features/marketing/contracts-subsidies';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'commercial.contract.read');
  return getContractsSubsidiesService().subsidies(parseQuery(event, contractsSubsidiesQuerySchema));
});
