export const demoRoles = [
  'Demo Admin',
  'Director',
  'OCC',
  'Station Admin',
  'Maintenance Manager'
] as const;

export type DemoRole = (typeof demoRoles)[number];

export const defaultDemoRole: DemoRole = 'Demo Admin';

export const demoRoleActorIds: Record<DemoRole, string> = {
  'Demo Admin': 'USR-DEMO-ADMIN',
  Director: 'USR-DIRECTOR',
  OCC: 'USR-001',
  'Station Admin': 'USR-STATION-ADMIN',
  'Maintenance Manager': 'USR-MAINTENANCE-MANAGER'
};

export const demoRolePermissions: Record<DemoRole, readonly string[]> = {
  'Demo Admin': ['*'],
  Director: [
    'platform.dashboard.view',
    'flight_request.read',
    'flight_request.approve',
    'flight.read',
    'flight.approve',
    'flight.closure.create',
    'station.cost.approve',
    'ticketing.refund.decide',
    'finance.payment.record',
    'document.read',
    'document.verify'
  ],
  OCC: [
    'platform.dashboard.view',
    'flight_request.read',
    'flight_request.create',
    'flight.read',
    'flight.following.update',
    'flight.manifest.update',
    'flight.fuel.update',
    'ticketing.sales.open',
    'ticketing.operation.update',
    'document.read',
    'document.upload'
  ],
  'Station Admin': [
    'platform.dashboard.view',
    'flight.read',
    'flight.manifest.update',
    'flight.fuel.update',
    'station.operation.update',
    'ticketing.operation.update',
    'document.read',
    'document.upload'
  ],
  'Maintenance Manager': [
    'platform.dashboard.view',
    'flight.read',
    'maintenance.handoff.update',
    'document.read',
    'document.verify'
  ]
};
