import { describe, expect, it } from 'vitest';
import { demoCapabilityResponseSchema } from '../../shared/contracts/demo-capabilities';

describe('demo capability contract', () => {
  it('requires an explicit non-operational synthetic preview marker', () => {
    const result = demoCapabilityResponseSchema.safeParse({
      mode: 'CONCEPT_PREVIEW',
      source: 'SYNTHETIC_FIXTURE',
      nonOperational: false,
      generatedAt: new Date().toISOString(),
      sections: []
    });
    expect(result.success).toBe(false);
  });
});
