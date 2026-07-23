import { z } from 'zod';
import { stationRecordActionBodySchema } from '#shared/contracts/flight-operations';
import {
  getDemoActorContext,
  getDemoActorId,
  requireDemoPermission
} from '../../../../../utils/auth';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { DomainError } from '../../../../../utils/errors';
import { getServices } from '../../../../../utils/services';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'station.operation.update');
  const { id } = parseParams(event, z.object({ id: z.string().min(1) }));
  const body = await parseBody(
    event,
    stationRecordActionBodySchema.extend({ reason: z.string().trim().min(1).max(1000) })
  );
  const service = getServices().flightOperations;
  const record = service.listStationServices().find((item) => item.id === id);
  if (!record) throw new DomainError('NOT_FOUND', `Station service ${id} not found.`, 404);
  service.assertActorStationScope(record.stationId, getDemoActorContext(event));
  return service.rejectStationService(id, body.reason, getDemoActorId(event), body.expectedVersion);
});
