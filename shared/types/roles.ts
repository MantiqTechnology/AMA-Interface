export const demoRoles = [
  'Demo Admin',
  'Director',
  'OCC',
  'Station Admin',
  'Finance Reviewer',
  'Maintenance Manager',
  'Inventory Controller'
] as const;

export type DemoRole = (typeof demoRoles)[number];

export const defaultDemoRole: DemoRole = 'Demo Admin';

export const demoRoleActorIds: Record<DemoRole, string> = {
  'Demo Admin': 'USR-DEMO-ADMIN',
  Director: 'USR-DIRECTOR',
  OCC: 'USR-001',
  'Station Admin': 'USR-STATION-ADMIN',
  'Finance Reviewer': 'USR-FINANCE-REVIEWER',
  'Maintenance Manager': 'USR-MAINTENANCE-MANAGER',
  'Inventory Controller': 'USR-INVENTORY-CONTROLLER'
};

export const demoRoleStationScopes: Record<DemoRole, readonly string[]> = {
  'Demo Admin': ['ALL'],
  Director: ['ALL'],
  OCC: ['DJJ', 'WMX'],
  'Station Admin': ['WMX'],
  'Finance Reviewer': ['ALL'],
  'Maintenance Manager': ['DJJ'],
  'Inventory Controller': ['ALL']
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
    'finance.invoice.read',
    'finance.payment.record',
    'document.read',
    'document.verify',
    'inventory.read',
    'inventory.po.approve',
    'inventory.valuation.read',
    'master_data.read'
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
    'document.upload',
    'inventory.read',
    'master_data.read'
  ],
  'Station Admin': [
    'platform.dashboard.view',
    'flight.read',
    'flight.manifest.update',
    'flight.fuel.update',
    'station.operation.update',
    'ticketing.operation.update',
    'document.read',
    'document.upload',
    'inventory.read',
    'master_data.read'
  ],
  'Finance Reviewer': [
    'platform.dashboard.view',
    'flight.read',
    'finance.invoice.read',
    'finance.invoice.approve',
    'finance.handoff.process',
    'finance.payment.record',
    'document.read',
    'document.verify',
    'inventory.read',
    'inventory.valuation.read'
  ],
  'Maintenance Manager': [
    'platform.dashboard.view',
    'flight.read',
    'maintenance.handoff.update',
    'document.read',
    'document.verify',
    'inventory.read',
    'inventory.procurement.request',
    'inventory.issue',
    'inventory.repair.manage'
  ],
  'Inventory Controller': [
    'platform.dashboard.view',
    'inventory.read',
    'inventory.catalog.manage',
    'inventory.procurement.request',
    'inventory.procurement.manage',
    'inventory.receive',
    'inventory.transfer',
    'inventory.adjust',
    'inventory.count',
    'inventory.issue',
    'inventory.repair.manage',
    'inventory.valuation.read',
    'document.read',
    'document.upload'
  ]
};
