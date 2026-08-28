import { describe, expect, it } from 'vitest';
import { demoAccounts, authenticateDemoAccount } from '../../server/utils/demo-accounts';
import { createDemoSessionToken, verifyDemoSessionToken } from '../../server/utils/auth';

describe('controlled demo authentication', () => {
  it('authenticates every declared operational demo account', () => {
    expect(demoAccounts).toHaveLength(10);
    for (const account of demoAccounts) {
      expect(authenticateDemoAccount(account.username, account.password)?.role).toBe(account.role);
      expect(authenticateDemoAccount(account.username, `${account.password}-wrong`)).toBeNull();
    }
  });

  it('rejects altered and expired signed sessions', () => {
    const account = demoAccounts[0];
    const issuedAt = Date.parse('2026-08-24T00:00:00.000Z');
    const token = createDemoSessionToken(account, issuedAt);
    expect(verifyDemoSessionToken(token, issuedAt + 1_000)?.role).toBe('Director');

    const [payload, signature] = token.split('.');
    expect(verifyDemoSessionToken(`${payload}x.${signature}`, issuedAt + 1_000)).toBeNull();
    expect(verifyDemoSessionToken(token, issuedAt + 9 * 60 * 60 * 1000)).toBeNull();
  });
});
