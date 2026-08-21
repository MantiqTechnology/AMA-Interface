import { adjustmentIdParamsSchema } from '../../../../../shared/features/finance/closing';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.accounting.post');
  const { id } = parseParams(event, adjustmentIdParamsSchema);
  const adjustment = getServices().financeClosing.getAdjustment(id);
  return adjustment.type === 'ACCRUAL'
    ? getServices().financeClosing.postAccrual(id, getDemoActorId(event))
    : getServices().financeClosing.postPrepayment(id, getDemoActorId(event));
});
