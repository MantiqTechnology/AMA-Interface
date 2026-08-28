import { createHmac, timingSafeEqual } from 'node:crypto';
import { deleteCookie, getCookie, getRequestHost, setCookie, type H3Event } from 'h3';
import { demoRoleSchema } from '../../shared/contracts/auth';
import {
  demoRoleActorIds,
  demoRolePermissions,
  demoRoleStationScopes,
  type DemoRole
} from '../../shared/types/roles';
import { DomainError } from './errors';
import { demoAccountByRole, type DemoAccount } from './demo-accounts';

export const demoSessionCookieName = 'ama_demo_session';
const legacyRoleCookieName = 'ama_demo_role';
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

export type DemoSessionPayload = {
  version: 1;
  userId: string;
  username: string;
  role: DemoRole;
  issuedAt: number;
  expiresAt: number;
};

function sessionSecret() {
  let secret: unknown = process.env.DEMO_SESSION_SECRET;
  if (typeof secret === 'string' && secret) return secret;
  try {
    secret = useRuntimeConfig().demoSessionSecret;
  } catch {
    secret = undefined;
  }
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    throw new DomainError(
      'DEMO_SESSION_SECRET_REQUIRED',
      'DEMO_SESSION_SECRET must contain at least 32 bytes.',
      503
    );
  }
  return secret;
}

function signature(encodedPayload: string) {
  return createHmac('sha256', sessionSecret()).update(encodedPayload).digest('base64url');
}

function safelyEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createDemoSessionToken(
  account: Pick<DemoAccount, 'userId' | 'username' | 'role'>,
  now = Date.now()
) {
  const payload: DemoSessionPayload = {
    version: 1,
    userId: account.userId,
    username: account.username,
    role: account.role,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_SECONDS * 1000
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

export function verifyDemoSessionToken(token: string, now = Date.now()): DemoSessionPayload | null {
  const [encodedPayload, suppliedSignature, extra] = token.split('.');
  if (!encodedPayload || !suppliedSignature || extra) return null;
  if (!safelyEqual(suppliedSignature, signature(encodedPayload))) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString()
    ) as Partial<DemoSessionPayload>;
    const role = demoRoleSchema.safeParse(payload.role);
    if (
      payload.version !== 1 ||
      !role.success ||
      typeof payload.userId !== 'string' ||
      typeof payload.username !== 'string' ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      payload.issuedAt > now + 60_000 ||
      payload.expiresAt <= now
    ) {
      return null;
    }
    return {
      version: 1,
      userId: payload.userId,
      username: payload.username,
      role: role.data,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt
    };
  } catch {
    return null;
  }
}

export function isExplicitDemoRuntime() {
  if (process.env.DEMO_MODE !== undefined) return process.env.DEMO_MODE === 'true';
  let runtimeDemoMode: unknown;
  try {
    runtimeDemoMode = useRuntimeConfig().demoMode;
  } catch {
    runtimeDemoMode = process.env.DEMO_MODE;
  }
  return runtimeDemoMode === true || String(runtimeDemoMode) === 'true';
}

export function requireExplicitDemoRuntime(action = 'demo helper') {
  if (!isExplicitDemoRuntime()) {
    throw new DomainError('DEMO_MODE_REQUIRED', `${action} is available only in demo mode.`, 403, {
      requiredAction: 'Set DEMO_MODE=true only for the controlled local demo environment.',
      impact: 'The demo helper request was rejected.'
    });
  }
}

function legacyTestSession(event: H3Event): DemoSessionPayload | null {
  if (process.env.AMA_ALLOW_LEGACY_TEST_ROLE_COOKIE !== 'true') {
    return null;
  }
  const parsed = demoRoleSchema.safeParse(getCookie(event, legacyRoleCookieName));
  const account = parsed.success ? demoAccountByRole(parsed.data) : null;
  if (!account) return null;
  const now = Date.now();
  return {
    version: 1,
    userId: account.userId,
    username: account.username,
    role: account.role,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_SECONDS * 1000
  };
}

export function getOptionalDemoSession(event: H3Event): DemoSessionPayload | null {
  const cached = event.context.demoSession as DemoSessionPayload | undefined;
  if (cached) return cached;
  const token = getCookie(event, demoSessionCookieName);
  const session = token ? verifyDemoSessionToken(token) : legacyTestSession(event);
  if (session) event.context.demoSession = session;
  return session;
}

export function requireDemoSession(event: H3Event) {
  const session = getOptionalDemoSession(event);
  if (!session) {
    throw new DomainError('UNAUTHORIZED', 'A valid demo session is required.', 401);
  }
  return session;
}

export function getDemoRole(event: H3Event): DemoRole {
  return requireDemoSession(event).role;
}

export function setDemoSession(event: H3Event, account: DemoAccount) {
  const token = createDemoSessionToken(account);
  setCookie(event, demoSessionCookieName, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' && !isLoopbackRequest(event),
    path: '/',
    maxAge: SESSION_DURATION_SECONDS
  });
  deleteCookie(event, legacyRoleCookieName, { path: '/' });
  return verifyDemoSessionToken(token)!;
}

export function clearDemoSession(event: H3Event) {
  deleteCookie(event, demoSessionCookieName, { path: '/' });
  deleteCookie(event, legacyRoleCookieName, { path: '/' });
}

export function isLoopbackRequest(event: H3Event) {
  const address = event.node.req.socket.remoteAddress ?? '';
  const requestHost = getRequestHost(event).toLowerCase();
  const hostname = requestHost.startsWith('[')
    ? requestHost.slice(1, requestHost.indexOf(']'))
    : requestHost.split(':')[0];
  return (
    address === '127.0.0.1' ||
    address === '::1' ||
    address === '::ffff:127.0.0.1' ||
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === '::1'
  );
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

const employeeCookieName = 'ama_employee_id';

export function getEmployeeSessionId(event: H3Event): string | null {
  const id = getCookie(event, employeeCookieName);
  return id && id.trim().length > 0 ? id : null;
}

export function setEmployeeSession(event: H3Event, employeeId: string) {
  setCookie(event, employeeCookieName, employeeId, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearEmployeeSession(event: H3Event) {
  setCookie(event, employeeCookieName, '', {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

export function requireEmployeeAuth(event: H3Event): string {
  const employeeId = getEmployeeSessionId(event);
  if (!employeeId) {
    throw new DomainError('UNAUTHORIZED', 'Employee login required for self-service portal.', 401);
  }
  return employeeId;
}

export function getDemoActorContext(event: H3Event) {
  return {
    userId: getDemoActorId(event),
    role: getDemoRole(event),
    stationCodes: getDemoStationScope(event) as string[],
    requestId: String(event.context.requestId ?? '')
  };
}
