import { receiveFinanceHandoffBodySchema } from '../../../../shared/features/finance/handoffs';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.handoff.process');
  const input = await parseBody(event, receiveFinanceHandoffBodySchema);
  return getServices().financeHandoffs.receive({ ...input, createdBy: getDemoActorId(event) });
});
