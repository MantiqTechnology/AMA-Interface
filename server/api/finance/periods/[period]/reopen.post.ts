import {
  periodCodeParamsSchema,
  reopenRequestBodySchema
} from '../../../../../shared/features/finance/closing';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.accounting.post');
  const { period } = parseParams(event, periodCodeParamsSchema);
  const body = await parseBody(event, reopenRequestBodySchema);
  return getServices().financeClosing.requestReopen(period, {
    reason: body.reason,
    requesterId: getDemoActorId(event)
  });
});
