import { z } from 'zod';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseBody, parseParams } from '../../../../../utils/validation';
import {
  getDemoActorContext,
  getDemoActorId,
  requireDemoPermission
} from '../../../../../utils/auth';
import { DomainError } from '../../../../../utils/errors';
import { stationRecordActionBodySchema } from '#shared/contracts/flight-operations';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'station.cost.approve');
  const params = parseParams(event, z.object({ id: z.string().min(1) }));
  const body = await parseBody(event, stationRecordActionBodySchema);
  const service = getServices().flightOperations;
  const record = service.listStationCosts().find((item) => item.id === params.id);
  if (!record) throw new DomainError('NOT_FOUND', `Station cost ${params.id} not found.`, 404);
  service.assertActorStationScope(record.stationId, getDemoActorContext(event));
  return service.approveStationCost(params.id, getDemoActorId(event), body.expectedVersion);
});
