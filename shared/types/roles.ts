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
  'Demo Admin': 'USR-ADMIN',
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
    'finance.accounting.read',
    'finance.accounting.post',
    'finance.payment.record',
    'document.read',
    'document.verify',
    'inventory.read',
    'inventory.po.approve',
    'inventory.valuation.read',
    'asset.read',
    'asset.finance.read',
    'master_data.read',
    'station.task.view',
    'readiness.view',
    'flight.closure.execute'
  ],
  OCC: [
    'platform.dashboard.view',
    'flight_request.read',
    'flight_request.create',
    'flight.read',
    'flight.create.direct',
    'flight.readiness.evaluate',
    'flight.schedule',
    'flight.movement.update',
    'flight.exception.update',
    'flight.manifest.update',
    'flight.fuel.update',
    'ticketing.sales.open',
    'ticketing.operation.update',
    'document.read',
    'document.upload',
    'inventory.read',
    'master_data.read',
    'station.task.view',
    'station.signoff.approve',
    'readiness.view',
    'readiness.attest',
    'flight.departure.execute'
  ],
  'Station Admin': [
    'platform.dashboard.view',
    'flight.read',
    'flight.readiness.evaluate',
    'flight.movement.update',
    'flight.manifest.update',
    'flight.fuel.update',
    'station.operation.update',
    'ticketing.operation.update',
    'document.read',
    'document.upload',
    'inventory.read',
    'asset.read',
    'asset.assign',
    'asset.move',
    'master_data.read',
    'station.task.view',
    'station.task.assign',
    'station.task.start',
    'station.task.verify',
    'station.task.reject',
    'station.evidence.add',
    'station.origin.signoff',
    'station.destination.signoff',
    'readiness.view',
    'readiness.attest'
  ],
  'Finance Reviewer': [
    'platform.dashboard.view',
    'flight.read',
    'finance.invoice.read',
    'finance.invoice.approve',
    'finance.accounting.read',
    'finance.accounting.post',
    'finance.handoff.process',
    'finance.payment.record',
    'document.read',
    'document.verify',
    'inventory.read',
    'asset.read',
    'asset.finance.read',
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
    'inventory.repair.manage',
    'asset.read',
    'asset.maintenance.manage'
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
    'asset.read',
    'document.read',
    'document.upload'
  ]
};
