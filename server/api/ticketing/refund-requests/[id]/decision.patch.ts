import {
  decideTicketRefundSchema,
  ticketRefundIdParamsSchema
} from '../../../../../shared/features/ticketing/refunds';
import { getTicketRefundService } from '../../../../features/ticketing/refunds';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) =>
  getTicketRefundService().decide(
    parseParams(event, ticketRefundIdParamsSchema).id,
    await parseBody(event, decideTicketRefundSchema),
    getDemoActorId(event)
  )
);
