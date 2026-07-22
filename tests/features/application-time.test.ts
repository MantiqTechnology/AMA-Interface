import { describe, expect, it } from 'vitest';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { getApplicationNow } from '../../server/utils/time';

describe('application time', () => {
  it('uses the Papua seed clock in demo mode and live time outside demo mode', () => {
    const originalDemoMode = process.env.DEMO_MODE;
    const originalSeedDate = process.env.DEMO_SEED_DATE;
    try {
      process.env.DEMO_SEED_DATE = '2026-07-22';
      process.env.DEMO_MODE = 'true';
      expect(getApplicationNow()).toBe(createDemoSeedContext().now);
      process.env.DEMO_MODE = 'false';
      expect(getApplicationNow()).not.toBe(createDemoSeedContext().now);
    } finally {
      if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = originalDemoMode;
      if (originalSeedDate === undefined) delete process.env.DEMO_SEED_DATE;
      else process.env.DEMO_SEED_DATE = originalSeedDate;
    }
  });
});
