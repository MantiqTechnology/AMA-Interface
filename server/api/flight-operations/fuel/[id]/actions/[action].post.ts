import { z } from 'zod';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseBody, parseParams } from '../../../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../../../utils/auth';

const paramsSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['approve', 'uplift', 'post', 'reject'])
});

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.fuel.update');
  const params = parseParams(event, paramsSchema);
  const body = await parseBody(event, z.record(z.unknown()));
  return getServices().flightOperations.fuelAction(
    params.id,
    params.action,
    body,
    getDemoActorId(event)
  );
});
