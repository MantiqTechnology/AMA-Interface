import { getCookie, setCookie, type H3Event } from 'h3';
import { demoRoleSchema } from '../../shared/contracts/auth';
import {
  defaultDemoRole,
  demoRoleActorIds,
  demoRolePermissions,
  demoRoleStationScopes,
  type DemoRole
} from '../../shared/types/roles';
import { DomainError } from './errors';

const roleCookieName = 'ama_demo_role';

export function getDemoRole(event: H3Event): DemoRole {
  const role = getCookie(event, roleCookieName);
  const parsed = demoRoleSchema.safeParse(role);
  return parsed.success ? parsed.data : defaultDemoRole;
}

export function setDemoRole(event: H3Event, role: DemoRole) {
  setCookie(event, roleCookieName, role, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14
  });
}

export function getDemoActorId(event: H3Event) {
  return demoRoleActorIds[getDemoRole(event)];
}

export function getDemoStationScope(event: H3Event) {
  return demoRoleStationScopes[getDemoRole(event)];
}

export function requireDemoStationAccess(event: H3Event, stationCode: string) {
  const scope = getDemoStationScope(event);
  if (!scope.includes('ALL') && !scope.includes(stationCode)) {
    throw new DomainError(
      'INVENTORY_STATION_FORBIDDEN',
      `${getDemoRole(event)} cannot access inventory at station ${stationCode}.`,
      403,
      { stationCode, scope }
    );
  }
}

export function requireDemoFlightStationAccess(
  event: H3Event,
  stationCodes: Array<string | null | undefined>
) {
  const scope = getDemoStationScope(event);
  const relevantCodes = stationCodes.filter((code): code is string => Boolean(code));
  if (!scope.includes('ALL') && !relevantCodes.some((stationCode) => scope.includes(stationCode))) {
    throw new DomainError(
      'FLIGHT_STATION_FORBIDDEN',
      `${getDemoRole(event)} cannot perform this action for the flight station.`,
      403,
      { stationCodes: relevantCodes, scope }
    );
  }
}

export function requireDemoPermission(event: H3Event, permissionId: string) {
  const rawRole = getCookie(event, roleCookieName);
  if (rawRole !== undefined && !demoRoleSchema.safeParse(rawRole).success) {
    throw new DomainError('FORBIDDEN', 'The demo role cookie is invalid.', 403, {
      permissionId,
      role: rawRole
    });
  }
  const role = getDemoRole(event);
  const permissions = demoRolePermissions[role];
  if (!permissions.includes('*') && !permissions.includes(permissionId)) {
    throw new DomainError(
      'FORBIDDEN',
      `${role} does not have permission to perform this action.`,
      403,
      { permissionId, role }
    );
  }
  return role;
}

export function hasDemoPermission(event: H3Event, permissionId: string) {
  const role = getDemoRole(event);
  const permissions = demoRolePermissions[role];
  return permissions.includes('*') || permissions.includes(permissionId);
}

export function getDemoActorContext(event: H3Event) {
  return {
    userId: getDemoActorId(event),
    role: getDemoRole(event),
    stationCodes: getDemoStationScope(event) as string[],
    requestId: String(event.context.requestId ?? '')
  };
}
