// app/features/avtur/workbench.ts

export const avturTabs = [
  'transactions',
  'drums',
  'skids',
  'quality-controls',
  'maintenances',
  'iot-devices',
  'audit-trail'
] as const;

export type AvturTab = (typeof avturTabs)[number];

export function resolveAvturTab(value: unknown): AvturTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return avturTabs.includes(candidate as AvturTab)
    ? (candidate as AvturTab)
    : 'transactions';
}

export function humanizeAvturStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}