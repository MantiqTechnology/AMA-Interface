export const demoRoles = [
  'Demo Admin',
  'Director',
  'OCC',
  'Station Admin',
  'Maintenance Manager'
] as const;

export type DemoRole = (typeof demoRoles)[number];

export const defaultDemoRole: DemoRole = 'Demo Admin';
