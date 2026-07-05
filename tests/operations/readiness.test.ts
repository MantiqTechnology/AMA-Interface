import { describe, expect, it } from 'vitest';
import seedDatabase from '../../data/ops-demo-db.json';
import type { DemoDatabase } from '../../shared/types/ops-demo';
import { calculateReadiness } from '../../app/utils/operations/readiness';

function cloneSeed() {
  return JSON.parse(JSON.stringify(seedDatabase)) as DemoDatabase;
}

function request(data: DemoDatabase, id: string) {
  const found = data.flightRequests.find((item) => item.id === id);
  if (!found) throw new Error(`Missing request ${id}`);
  return found;
}

describe('operations readiness rules', () => {
  it('keeps the happy-path request FR-20260706-001 free of blockers', () => {
    const data = cloneSeed();
    const readiness = calculateReadiness(request(data, 'FR-20260706-001'), data);

    expect(readiness.overallDecision).toBe('READY_FOR_APPROVAL');
    expect(readiness.items.some((item) => item.state === 'BLOCKER')).toBe(false);
  });

  it('blocks medevac when fuel and duty-time are insufficient', () => {
    const data = cloneSeed();
    const readiness = calculateReadiness(request(data, 'FR-20260706-002'), data);

    expect(readiness.overallState).toBe('BLOCKER');
    expect(readiness.items.find((item) => item.code === 'FUEL_CONFIRMATION')?.state).toBe('BLOCKER');
    expect(readiness.items.find((item) => item.code === 'CREW_DUTY_TIME')?.state).toBe('BLOCKER');
  });

  it('blocks charter request with expired PAC qualification and pending handling', () => {
    const data = cloneSeed();
    const readiness = calculateReadiness(request(data, 'FR-20260706-003'), data);

    expect(readiness.overallState).toBe('BLOCKER');
    expect(readiness.items.find((item) => item.code === 'CREW_QUALIFICATION')?.state).toBe(
      'BLOCKER'
    );
    expect(readiness.items.find((item) => item.code === 'DESTINATION_HANDLING')?.state).toBe(
      'BLOCKER'
    );
  });
});
