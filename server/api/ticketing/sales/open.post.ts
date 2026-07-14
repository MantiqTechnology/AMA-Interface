import { openTicketingSalesSchema } from '../../../../shared/features/ticketing/sales';
import { getTicketingSalesService } from '../../../features/ticketing/sales';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'ticketing.sales.open');
  return getTicketingSalesService().open(
    await parseBody(event, openTicketingSalesSchema),
    getDemoActorId(event)
  );
});
