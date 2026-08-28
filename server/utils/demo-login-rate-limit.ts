import type { H3Event } from 'h3';
import { getRequestIP } from 'h3';
import { DomainError } from './errors';

type AttemptState = {
  failures: number[];
  blockedUntil?: number;
};

const attempts = new Map<string, AttemptState>();
const WINDOW_MS = 5 * 60 * 1000;
const BLOCK_MS = 60 * 1000;
const MAX_FAILURES = 5;

function keyFor(event: H3Event, username: string) {
  return `${getRequestIP(event, { xForwardedFor: false }) ?? 'unknown'}:${username}`;
}

function currentState(event: H3Event, username: string, now = Date.now()) {
  const key = keyFor(event, username);
  const state = attempts.get(key) ?? { failures: [] };
  state.failures = state.failures.filter((time) => time > now - WINDOW_MS);
  if (state.blockedUntil && state.blockedUntil <= now) state.blockedUntil = undefined;
  attempts.set(key, state);
  return { key, state };
}

export function assertDemoLoginAllowed(event: H3Event, username: string, now = Date.now()) {
  const { state } = currentState(event, username, now);
  if (state.blockedUntil && state.blockedUntil > now) {
    throw new DomainError(
      'LOGIN_RATE_LIMITED',
      'Too many failed sign-in attempts. Wait one minute and try again.',
      429,
      { retryAfterSeconds: Math.ceil((state.blockedUntil - now) / 1000) }
    );
  }
}

export function recordDemoLoginFailure(event: H3Event, username: string, now = Date.now()) {
  const { state } = currentState(event, username, now);
  state.failures.push(now);
  if (state.failures.length >= MAX_FAILURES) state.blockedUntil = now + BLOCK_MS;
}

export function clearDemoLoginFailures(event: H3Event, username: string) {
  attempts.delete(keyFor(event, username));
}

export function resetDemoLoginRateLimitForTests() {
  attempts.clear();
}
