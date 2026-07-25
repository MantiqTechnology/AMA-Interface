export const stationWorkspaceTabs = [
  'tasks',
  'services',
  'evidence',
  'costs',
  'arrival',
  'audit'
] as const;

export type StationWorkspaceTab = (typeof stationWorkspaceTabs)[number];

const stationWorkspaceTabSet: ReadonlySet<string> = new Set(stationWorkspaceTabs);

export function isStationWorkspaceTab(value: unknown): value is StationWorkspaceTab {
  return typeof value === 'string' && stationWorkspaceTabSet.has(value);
}

export function normalizeStationWorkspaceTab(
  value: unknown,
  fallback: StationWorkspaceTab = 'tasks'
): StationWorkspaceTab {
  return isStationWorkspaceTab(value) ? value : fallback;
}
