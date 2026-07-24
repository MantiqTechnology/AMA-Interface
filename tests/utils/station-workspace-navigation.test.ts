import { describe, expect, it } from 'vitest';
import {
  normalizeStationWorkspaceTab,
  stationWorkspaceTabs
} from '../../app/utils/operations/station-workspace-navigation';

describe('station workspace navigation', () => {
  it.each(stationWorkspaceTabs)('preserves the supported %s tab', (tab) => {
    expect(normalizeStationWorkspaceTab(tab)).toBe(tab);
  });

  it.each([undefined, null, '', 'unknown', ['services']])(
    'returns tasks for an unsupported route value',
    (value) => {
      expect(normalizeStationWorkspaceTab(value)).toBe('tasks');
    }
  );
});
