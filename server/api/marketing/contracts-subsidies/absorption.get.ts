import { getContractsSubsidiesService } from '../../../features/marketing/contracts-subsidies';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';
import { contractsSubsidiesAbsorptionQuerySchema } from '../../../../shared/features/marketing/contracts-subsidies';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'commercial.contract.read');
  return getContractsSubsidiesService().absorption(
    parseQuery(event, contractsSubsidiesAbsorptionQuerySchema)
  );
});
