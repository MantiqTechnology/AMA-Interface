import type { DemoSessionDto } from '../../shared/contracts/auth';
import { demoAccountByRole } from './demo-accounts';
import type { DemoSessionPayload } from './auth';
import { DomainError } from './errors';

export function toDemoSessionDto(payload: DemoSessionPayload): DemoSessionDto {
  const account = demoAccountByRole(payload.role);
  if (!account || account.userId !== payload.userId || account.username !== payload.username) {
    throw new DomainError('UNAUTHORIZED', 'The demo account is no longer available.', 401);
  }
  return {
    authenticated: true,
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
    displayName: account.displayName,
    personaLabel: account.personaLabel,
    stationScopes: account.stationScopes,
    expiresAt: new Date(payload.expiresAt).toISOString(),
    demoMode: true
  };
}
