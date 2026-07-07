import { z } from 'zod';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler((event) => {
  const params = parseParams(event, z.object({ id: z.string().min(1) }));
  return getServices().flightOperations.approveStationCost(params.id);
});
