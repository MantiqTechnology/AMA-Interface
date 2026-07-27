import { describe, expect, it } from 'vitest';
import {
  shouldResetDemoDatabaseOnStartup,
  shouldSeedDemoDatabaseOnStartup
} from '../../server/db/startup-policy';

describe('database startup reset policy', () => {
  it('does not reset the demo database on normal startup', () => {
    expect(shouldResetDemoDatabaseOnStartup({ demoMode: 'true' }, {})).toBe(false);
  });

  it('resets only when explicitly requested', () => {
    expect(
      shouldResetDemoDatabaseOnStartup({ demoMode: 'true' }, { AMA_RESET_ON_STARTUP: 'true' })
    ).toBe(true);
  });

  it('keeps the legacy skip flag authoritative', () => {
    expect(
      shouldResetDemoDatabaseOnStartup(
        { demoMode: 'true' },
        {
          AMA_RESET_ON_STARTUP: 'true',
          AMA_SKIP_STARTUP_RESET: 'true'
        }
      )
    ).toBe(false);
  });

  it('seeds an empty demo database on normal startup', () => {
    expect(shouldSeedDemoDatabaseOnStartup({ demoMode: 'true' }, {})).toBe(true);
  });

  it('does not seed outside demo mode or when startup initialization is skipped', () => {
    expect(shouldSeedDemoDatabaseOnStartup({ demoMode: 'false' }, {})).toBe(false);
    expect(
      shouldSeedDemoDatabaseOnStartup(
        { demoMode: 'true' },
        {
          AMA_SKIP_STARTUP_RESET: 'true'
        }
      )
    ).toBe(false);
  });
});
