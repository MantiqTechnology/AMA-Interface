import { z } from 'zod';
import { fuelActionBodySchema } from '#shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseBody, parseParams } from '../../../../../utils/validation';
import {
  getDemoActorContext,
  getDemoActorId,
  requireDemoPermission
} from '../../../../../utils/auth';
import { DomainError } from '../../../../../utils/errors';

const paramsSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['approve', 'uplift', 'post', 'reject'])
});

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'flight.fuel.update');
  const params = parseParams(event, paramsSchema);
  const body = await parseBody(event, fuelActionBodySchema);
  const service = getServices().flightOperations;
  const record = service.listFuel().find((item) => item.id === params.id);
  if (!record) throw new DomainError('NOT_FOUND', `Fuel request ${params.id} not found.`, 404);
  service.assertActorStationScope(record.stationId, getDemoActorContext(event));
  return service.fuelAction(params.id, params.action, body, getDemoActorId(event));
});
