import {
  decideTicketRefundSchema,
  ticketRefundIdParamsSchema
} from '../../../../../shared/features/ticketing/refunds';
import { getTicketRefundService } from '../../../../features/ticketing/refunds';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'ticketing.refund.decide');
  return getTicketRefundService().decide(
    parseParams(event, ticketRefundIdParamsSchema).id,
    await parseBody(event, decideTicketRefundSchema),
    getDemoActorId(event)
  );
});
