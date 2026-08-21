import { financialExportBodySchema } from '../../../../shared/features/finance/governance';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.audit.export');
  const body = await parseBody(event, financialExportBodySchema);
  return getServices().financeGovernance.exportReport(
    body.reportType,
    { period: body.period },
    {
      actorId: getDemoActorId(event),
      actorRole: getDemoRole(event)
    }
  );
});
