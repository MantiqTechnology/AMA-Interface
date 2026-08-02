import type { NeedsMyActionItemDto } from '#shared/contracts/flight-operations';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { defineApiEventHandler } from '#server/utils/api-response';
import { getServices } from '#server/utils/services';

export default defineApiEventHandler((event): NeedsMyActionItemDto[] => {
  requireDemoPermission(event, 'flight.read');
  return getServices().flightOperations.needsMyAction(getDemoActorContext(event));
});
