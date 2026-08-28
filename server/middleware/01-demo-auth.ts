import { randomUUID } from 'node:crypto';
import { getRequestHeader, setResponseStatus, type H3Event } from 'h3';
import { getOptionalDemoSession, isExplicitDemoRuntime } from '../utils/auth';

const publicApiPaths = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/auth/demo-accounts'
]);

const publicApiPrefixes = ['/api/ticketing/', '/api/auth/employee-'];
const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function failure(event: H3Event, statusCode: number, code: string, message: string) {
  event.context.requestId ??= randomUUID();
  setResponseStatus(event, statusCode);
  return {
    ok: false,
    error: { code, message },
    meta: { requestId: event.context.requestId, demoMode: true }
  };
}

export default defineEventHandler((event) => {
  if (!isExplicitDemoRuntime() || !event.path.startsWith('/api/')) return;
  if (
    publicApiPaths.has(event.path) ||
    publicApiPrefixes.some((prefix) => event.path.startsWith(prefix))
  ) {
    return;
  }

  if (!getOptionalDemoSession(event)) {
    return failure(event, 401, 'UNAUTHORIZED', 'A valid demo session is required.');
  }

  if (unsafeMethods.has(event.method)) {
    const origin = getRequestHeader(event, 'origin');
    const host = getRequestHeader(event, 'host');
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return failure(event, 403, 'ORIGIN_FORBIDDEN', 'Cross-origin mutation was rejected.');
        }
      } catch {
        return failure(event, 403, 'ORIGIN_FORBIDDEN', 'Request origin is invalid.');
      }
    }
  }
});
