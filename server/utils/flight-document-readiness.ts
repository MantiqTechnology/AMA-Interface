import { getServices } from './services';

export function invalidateFlightDocumentReadiness(
  ownerType: string,
  ownerId: string,
  actorUserId: string
) {
  if (ownerType !== 'flight') return;
  getServices().flightOperations.invalidateFlightDocumentVerification(ownerId, actorUserId);
}
