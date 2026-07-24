export const stationWorkspaceTabs = [
  'tasks',
  'services',
  'evidence',
  'costs',
  'arrival',
  'audit'
] as const;

export type StationWorkspaceTab = (typeof stationWorkspaceTabs)[number];

export function normalizeStationWorkspaceTab(value: unknown): StationWorkspaceTab {
  return typeof value === 'string' && stationWorkspaceTabs.includes(value as StationWorkspaceTab)
    ? (value as StationWorkspaceTab)
    : 'tasks';
}
