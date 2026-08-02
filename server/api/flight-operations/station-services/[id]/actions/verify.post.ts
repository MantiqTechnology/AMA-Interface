import { z } from 'zod';
import { stationRecordActionBodySchema } from '#shared/contracts/flight-operations';
import { getDemoActorContext, getDemoActorId, requireDemoPermission } from '#server/utils/auth';
import { defineApiEventHandler } from '#server/utils/api-response';
import { DomainError } from '#server/utils/errors';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'station.task.verify');
  const { id } = parseParams(event, z.object({ id: z.string().min(1) }));
  const body = await parseBody(event, stationRecordActionBodySchema);
  const service = getServices().flightOperations;
  const record = service.listStationServices().find((item) => item.id === id);
  if (!record) throw new DomainError('NOT_FOUND', `Station service ${id} not found.`, 404);
  service.assertActorStationScope(record.stationId, getDemoActorContext(event));
  return service.verifyStationService(id, getDemoActorId(event), body.expectedVersion);
});
