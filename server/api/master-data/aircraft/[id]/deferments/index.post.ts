import {
  aircraftDefermentInputSchema,
  aircraftIdParamsSchema
} from '#shared/features/operations/aircraft';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorId, getDemoRole, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';
import { parseBody, parseParams } from '#server/utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'aircraft.deferment.manage');
  const { id } = parseParams(event, aircraftIdParamsSchema);
  const body = await parseBody(event, aircraftDefermentInputSchema);
  return getServices().aircraftAirworthiness.deferDefect(id, body, {
    userId: getDemoActorId(event),
    role: getDemoRole(event)
  });
});
