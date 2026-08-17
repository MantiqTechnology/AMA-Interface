import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoStationScope, requireDemoPermission } from '../../../utils/auth';
import { getServices } from '../../../utils/services';
import { parseQuery } from '../../../utils/validation';
import { z } from 'zod';

const querySchema = z.object({
  status: z.enum(['ACTIVE', 'RESOLVED', 'CANCELLED']).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  stationId: z.string().trim().optional()
});

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'readiness.view');
  return getServices().flightOperations.listOperationalAdvisories(
    parseQuery(event, querySchema),
    getDemoStationScope(event)
  );
});
