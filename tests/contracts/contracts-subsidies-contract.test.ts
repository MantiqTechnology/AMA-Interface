import { describe, expect, it } from 'vitest';
import {
  contractsSubsidiesActivityQuerySchema,
  contractsSubsidiesContractsQuerySchema,
  contractsSubsidiesQuerySchema
} from '../../shared/features/marketing/contracts-subsidies';

describe('contracts and subsidies query contract', () => {
  it('accepts an inclusive date range and rejects a reversed range', () => {
    expect(
      contractsSubsidiesQuerySchema.parse({ from: '2026-08-25', to: '2026-08-26' })
    ).toMatchObject({ from: '2026-08-25', to: '2026-08-26' });

    expect(() =>
      contractsSubsidiesQuerySchema.parse({ from: '2026-08-27', to: '2026-08-26' })
    ).toThrow(/start date/i);
  });

  it('rejects invalid dates, limits, and endpoint-specific filter values', () => {
    expect(() => contractsSubsidiesQuerySchema.parse({ from: '2026-02-30' })).toThrow();
    expect(() => contractsSubsidiesActivityQuerySchema.parse({ limit: 0 })).toThrow();
    expect(() => contractsSubsidiesContractsQuerySchema.parse({ status: 'RECOGNIZED' })).toThrow();
    expect(() =>
      contractsSubsidiesContractsQuerySchema.parse({ type: 'FINANCE_READ_MODEL' })
    ).toThrow();
  });
});
