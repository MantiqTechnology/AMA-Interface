import { z } from 'zod';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { getValidatedQuery } from 'h3';

const stationOperationsQuerySchema = z.object({
  stationId: z.string().optional(),
  stationCode: z.string().optional(),
  operationalDate: z.string().optional(),
  flightId: z.string().optional(),
  phase: z.string().optional()
});

export type StationOperationsQuery = z.infer<typeof stationOperationsQuerySchema>;

export default defineApiEventHandler(async (event) => {
  const query = await getValidatedQuery(event, stationOperationsQuerySchema.parse);
  await requireDemoPermission(event, 'station.task.view');

  const services = getServices();
  const stationOperations = await services.flightOperations.getStationOperations(
    query,
    getDemoActorContext(event)
  );

  return stationOperations;
});
