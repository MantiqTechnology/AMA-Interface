import { accrualBodySchema } from '../../../../shared/features/finance/closing';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.accounting.post');
  const body = await parseBody(event, accrualBodySchema);
  return getServices().financeClosing.createAccrual({ ...body, createdBy: getDemoActorId(event) });
});
