import { processFinanceHandoffBodySchema } from '../../../../shared/features/finance/invoices';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.handoff.process');
  const { flightId } = await parseBody(event, processFinanceHandoffBodySchema);
  return getServices().invoices.finalizeClosedFlight(flightId, getDemoActorId(event));
});
