import { describe, expect, it } from 'vitest';
import { isoDateToLocalDate, localDateToIso } from './stationOperationsDate';

describe('stationOperationsDate', () => {
  it('keeps the selected calendar day without UTC conversion', () => {
    const date = isoDateToLocalDate('2026-07-25');

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(25);
    expect(localDateToIso(date)).toBe('2026-07-25');
  });

  it('pads month and day when serializing', () => {
    expect(localDateToIso(new Date(2026, 0, 3, 12, 0, 0))).toBe('2026-01-03');
  });
});
