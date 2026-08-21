import {
  closingItemBodySchema,
  closingRunParamsSchema
} from '../../../../../shared/features/finance/closing';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.accounting.post');
  const { id } = parseParams(event, closingRunParamsSchema);
  const body = await parseBody(event, closingItemBodySchema);
  return getServices().financeClosing.reviewChecklistItem(id, body.itemCode, {
    status: body.status,
    note: body.note,
    actorId: getDemoActorId(event)
  });
});
