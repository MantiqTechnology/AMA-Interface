import { depreciationRunBodySchema } from '../../../../shared/features/finance/closing';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.accounting.post');
  const body = await parseBody(event, depreciationRunBodySchema);
  return getServices().financeClosing.runDepreciation(body.periodCode, getDemoActorId(event));
});
