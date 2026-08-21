import { financeHandoffIdParamsSchema } from '../../../../../shared/features/finance/handoffs';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.handoff.process');
  return getServices().financeHandoffs.accept(
    parseParams(event, financeHandoffIdParamsSchema).id,
    getDemoActorId(event)
  );
});
