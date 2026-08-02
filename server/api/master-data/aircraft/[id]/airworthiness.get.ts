import { aircraftIdParamsSchema } from '#shared/features/operations/aircraft';
import { defineApiEventHandler } from '#server/utils/api-response';
import { requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseParams } from '#server/utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'aircraft.airworthiness.read');
  const { id } = parseParams(event, aircraftIdParamsSchema);
  return getServices().aircraftAirworthiness.detail(id);
});
