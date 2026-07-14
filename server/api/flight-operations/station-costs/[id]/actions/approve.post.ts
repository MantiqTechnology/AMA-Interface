import { z } from 'zod';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseParams } from '../../../../../utils/validation';
import { getDemoActorId, requireDemoPermission } from '../../../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'station.cost.approve');
  const params = parseParams(event, z.object({ id: z.string().min(1) }));
  return getServices().flightOperations.approveStationCost(params.id, getDemoActorId(event));
});
