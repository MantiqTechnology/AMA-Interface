import { openTicketingSalesSchema } from '../../../../shared/features/ticketing/sales';
import { getTicketingSalesService } from '../../../features/ticketing/sales';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) =>
  getTicketingSalesService().open(
    await parseBody(event, openTicketingSalesSchema),
    getDemoActorId(event)
  )
);
