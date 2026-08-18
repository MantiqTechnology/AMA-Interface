export const demoRoles = [
  'Demo Admin',
  'Director',
  'OCC',
  'OCC Checker',
  'Station Admin',
  'Station Admin Origin',
  'Finance Reviewer',
  'Maintenance Manager',
  'Maintenance Technician',
  'Certifying Staff',
  'Inventory Controller',
  'HR Staff',
  'HR Manager',
  'Chief of Pilot',
  'Employee'
] as const;

export type DemoRole = (typeof demoRoles)[number];

export const defaultDemoRole: DemoRole = 'Demo Admin';

export const demoRoleActorIds: Record<DemoRole, string> = {
  'Demo Admin': 'USR-ADMIN',
  Director: 'USR-DIRECTOR',
  OCC: 'USR-001',
  'OCC Checker': 'USR-OCC-CHECKER',
  'Station Admin': 'USR-STATION-ADMIN',
  'Station Admin Origin': 'USR-STATION-ADMIN-DJJ',
  'Finance Reviewer': 'USR-FINANCE-REVIEWER',
  'Maintenance Manager': 'USR-MAINTENANCE-MANAGER',
  'Maintenance Technician': 'USR-MAINTENANCE-TECHNICIAN',
  'Certifying Staff': 'USR-CERTIFYING-STAFF',
  'Inventory Controller': 'USR-INVENTORY-CONTROLLER',
  'HR Staff': 'USR-HR-STAFF',
  'HR Manager': 'USR-HR-MANAGER',
  'Chief of Pilot': 'USR-CHIEF-PILOT',
  Employee: 'USR-EMPLOYEE'
};

export const demoRoleStationScopes: Record<DemoRole, readonly string[]> = {
  'Demo Admin': ['ALL'],
  Director: ['ALL'],
  OCC: ['DJJ', 'WMX'],
  'OCC Checker': ['DJJ', 'WMX'],
  'Station Admin': ['WMX'],
  'Station Admin Origin': ['DJJ'],
  'Finance Reviewer': ['ALL'],
  'Maintenance Manager': ['DJJ'],
  'Maintenance Technician': ['DJJ'],
  'Certifying Staff': ['ALL'],
  'Inventory Controller': ['ALL'],
  'HR Staff': ['ALL'],
  'HR Manager': ['ALL'],
  'Chief of Pilot': ['ALL'],
  Employee: ['ALL']
};

const personnelReadPermissions = [
  'personnel.read',
  'personnel.license.read',
  'personnel.medical.read',
  'personnel.qualification.read',
  'personnel.documents.read',
  'personnel.history.read'
] as const;

const personnelManagePermissions = [
  'personnel.manage',
  'personnel.assignment.manage',
  'personnel.license.manage',
  'personnel.medical.manage',
  'personnel.qualification.manage',
  'personnel.documents.manage'
] as const;

const customerReadPermissions = [
  'customer.read',
  'customer.contact.read',
  'customer.rate.read',
  'customer.contract.read',
  'customer.document.read',
  'customer.activity.read',
  'customer.note.read',
  'customer.history.read'
] as const;

const customerManagePermissions = [
  'customer.manage',
  'customer.contact.manage',
  'customer.document.manage',
  'customer.note.manage'
] as const;

const customerFinancePermissions = [
  'customer.financial.read',
  'customer.credit.manage',
  'customer.sensitive.read'
] as const;

const agentReadPermissions = [
  'agent.read',
  'agent.contact.read',
  'agent.commission.read',
  'agent.rate.read',
  'agent.contract.read',
  'agent.document.read',
  'agent.activity.read',
  'agent.note.read',
  'agent.history.read'
] as const;

const agentManagePermissions = [
  'agent.manage',
  'agent.activate',
  'agent.suspend',
  'agent.archive',
  'agent.contact.manage',
  'agent.commission.manage',
  'agent.document.manage',
  'agent.note.manage'
] as const;

const agentFinancePermissions = [
  'agent.commission.financial.read',
  'agent.sensitive.read'
] as const;

const rateReadPermissions = [
  'rate.read',
  'rate.contract.read',
  'rate.document.read',
  'rate.history.read',
  'rate.preview'
] as const;

const rateManagePermissions = [
  'rate.manage',
  'rate.activate',
  'rate.archive',
  'rate.duplicate',
  'rate.document.manage'
] as const;

const commercialContractPermissions = ['commercial.contract.read'] as const;

const maintenanceDemoV2ReadPermissions = [
  'maintenance.approved_data.read',
  'maintenance.due.read',
  'maintenance.tooling.read',
  'maintenance.quality.read',
  'maintenance.audit_pack.export'
] as const;

const maintenanceResourceV21ReadPermissions = ['maintenance.v21.resource.read'] as const;

const maintenanceResourceV21WritePermissions = ['maintenance.v21.resource.write'] as const;

const maintenanceReadPermissions = [
  'maintenance.package.read',
  'maintenance.audit.read',
  ...maintenanceResourceV21ReadPermissions,
  ...maintenanceDemoV2ReadPermissions
] as const;

const maintenanceControlPermissions = [
  ...maintenanceReadPermissions,
  'maintenance.defect.assess',
  'maintenance.package.plan',
  'maintenance.jobcard.manage',
  'maintenance.release.request',
  'maintenance.financial.claim',
  'maintenance.approved_data.manage',
  'maintenance.due.manage',
  'maintenance.tooling.manage',
  ...maintenanceResourceV21WritePermissions
] as const;

const maintenanceExecutionPermissions = [
  ...maintenanceReadPermissions,
  'maintenance.jobcard.start',
  'maintenance.jobcard.work.sign',
  'maintenance.jobcard.inspect'
] as const;

const maintenanceReleasePermissions = [
  ...maintenanceReadPermissions,
  'maintenance.jobcard.inspect',
  'maintenance.release.issue'
] as const;

const maintenanceQualityPermissions = [
  ...maintenanceReadPermissions,
  'maintenance.quality.manage'
] as const;

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
    'aircraft.airworthiness.read',
    ...maintenanceReadPermissions,
    'hris.employee.read',
    'hris.org.read',
    'hris.kpi.read',
    'hris.payroll.read',
    ...personnelReadPermissions,
    ...customerReadPermissions,
    ...customerFinancePermissions,
    ...agentReadPermissions,
    ...agentFinancePermissions,
    ...rateReadPermissions,
    ...commercialContractPermissions,
    'station.task.view',
    'readiness.view',
    'flight.manifest.view',
    'flight.closure.execute'
  ],
  OCC: [
    'platform.dashboard.view',
    'flight_request.read',
    'flight_request.create',
    'flight.read',
    'flight.create.direct',
    'flight.readiness.evaluate',
    'flight.advisory.manage',
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
    'aircraft.airworthiness.read',
    ...personnelReadPermissions,
    ...personnelManagePermissions,
    ...customerReadPermissions,
    ...customerManagePermissions,
    ...agentReadPermissions,
    ...agentManagePermissions,
    ...rateReadPermissions,
    ...rateManagePermissions,
    ...commercialContractPermissions,
    'station.task.view',
    'station.signoff.approve',
    'readiness.view',
    'readiness.attest',
    'flight.manifest.view',
    'flight.manifest.sensitive.read',
    'flight.manifest.review',
    'flight.manifest.lock',
    'flight.manifest.unlock',
    'flight.manifest.dg.decide',
    'flight.departure.assurance.evaluate',
    'flight.departure.ready',
    'flight.departure.execute',
    'aircraft.defect.report',
    'aircraft.lifecycle.manage'
  ],
  'OCC Checker': [
    'platform.dashboard.view',
    'flight.read',
    'flight.readiness.evaluate',
    'flight.readiness.approve',
    'document.read',
    'master_data.read',
    'aircraft.airworthiness.read',
    ...personnelReadPermissions,
    'station.task.view',
    'readiness.view'
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
    'hris.attendance.read',
    'hris.attendance.manage',
    'hris.schedule.read',
    ...personnelReadPermissions,
    'customer.read',
    'customer.contact.read',
    'customer.activity.read',
    'customer.document.read',
    ...agentReadPermissions,
    ...rateReadPermissions,
    ...commercialContractPermissions,
    'personnel.assignment.manage',
    'personnel.documents.manage',
    'station.task.view',
    'station.task.assign',
    'station.task.start',
    'station.task.verify',
    'station.task.reject',
    'station.maintenance_request.create',
    'station.evidence.add',
    'station.origin.signoff',
    'station.destination.signoff',
    'readiness.view',
    'readiness.attest',
    'flight.manifest.view',
    'flight.manifest.sensitive.read',
    'flight.manifest.prepare',
    'flight.manifest.submit',
    'flight.checkin.close'
  ],
  'Station Admin Origin': [
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
    ...personnelReadPermissions,
    'customer.read',
    'customer.contact.read',
    'customer.activity.read',
    'customer.document.read',
    ...agentReadPermissions,
    ...rateReadPermissions,
    ...commercialContractPermissions,
    'personnel.assignment.manage',
    'personnel.documents.manage',
    'station.task.view',
    'station.task.assign',
    'station.task.start',
    'station.task.verify',
    'station.task.reject',
    'station.maintenance_request.create',
    'station.evidence.add',
    'station.origin.signoff',
    'station.destination.signoff',
    'readiness.view',
    'readiness.attest',
    'flight.manifest.view',
    'flight.manifest.sensitive.read',
    'flight.manifest.prepare',
    'flight.manifest.submit',
    'flight.checkin.close'
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
    'station.cost.approve',
    'station.task.view',
    'document.read',
    'document.verify',
    'inventory.read',
    'asset.read',
    'asset.finance.read',
    'inventory.valuation.read',
    ...maintenanceReadPermissions,
    'hris.payroll.read',
    ...customerReadPermissions,
    ...customerFinancePermissions,
    ...agentReadPermissions,
    ...agentFinancePermissions,
    ...rateReadPermissions,
    ...commercialContractPermissions
  ],
  'Maintenance Manager': [
    'maintenance.demo.internal_aog.read',
    'maintenance.demo.internal_aog.reset',
    'platform.dashboard.view',
    'flight.read',
    'maintenance.handoff.update',
    'document.read',
    'document.verify',
    'inventory.read',
    'inventory.procurement.request',
    'inventory.issue',
    'inventory.repair.manage',
    'inventory.tool.checkout',
    'inventory.tool.manage',
    'asset.read',
    'asset.maintenance.manage',
    'aircraft.airworthiness.read',
    'aircraft.defect.report',
    'aircraft.defect.manage',
    'aircraft.deferment.manage',
    'maintenance.material.request',
    ...maintenanceControlPermissions,
    ...maintenanceExecutionPermissions,
    ...maintenanceQualityPermissions
  ],
  'Maintenance Technician': [
    'maintenance.demo.internal_aog.read',
    'maintenance.package.read',
    'platform.dashboard.view',
    'flight.read',
    'document.read',
    'inventory.read',
    'inventory.tool.checkout',
    'asset.read',
    'aircraft.airworthiness.read',
    'aircraft.defect.report',
    'maintenance.material.install',
    ...maintenanceExecutionPermissions
  ],
  'Certifying Staff': [
    'maintenance.demo.internal_aog.read',
    'maintenance.package.read',
    'platform.dashboard.view',
    'flight.read',
    'master_data.read',
    'aircraft.airworthiness.read',
    'aircraft.release.certify',
    'document.read',
    'document.verify',
    'maintenance.handoff.update',
    ...maintenanceReleasePermissions,
    'inventory.read',
    'inventory.tool.checkout',
    'inventory.quarantine.release',
    'asset.read'
  ],
  'Inventory Controller': [
    'maintenance.demo.internal_aog.read',
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
    'inventory.tool.checkout',
    'inventory.tool.manage',
    'inventory.valuation.read',
    'inventory.maintenance_demand.read',
    'inventory.material.reserve',
    'inventory.material.issue',
    'inventory.material.return',
    'asset.read',
    'document.read',
    'document.upload'
  ],
  'HR Staff': [
    'platform.dashboard.view',
    'hris.employee.read',
    'hris.employee.manage',
    'hris.employee.import',
    'hris.attendance.read',
    'hris.attendance.manage',
    'hris.leave.read',
    'hris.leave.approve',
    'hris.overtime.approve',
    'hris.certification.read',
    'hris.certification.manage',
    'hris.schedule.read',
    'hris.schedule.manage',
    'hris.payroll.read',
    'hris.payroll.calculate',
    'hris.allowance.read',
    'hris.allowance.manage',
    'hris.recruitment.manage',
    'hris.kpi.read',
    'hris.kpi.manage',
    'hris.org.read',
    'hris.self_service.read',
    'master_data.read'
  ],
  'HR Manager': [
    'platform.dashboard.view',
    'hris.employee.read',
    'hris.employee.manage',
    'hris.employee.import',
    'hris.attendance.read',
    'hris.attendance.manage',
    'hris.leave.read',
    'hris.leave.approve',
    'hris.overtime.approve',
    'hris.certification.read',
    'hris.certification.manage',
    'hris.schedule.read',
    'hris.schedule.manage',
    'hris.payroll.read',
    'hris.payroll.calculate',
    'hris.payroll.approve',
    'hris.payroll.journal',
    'hris.allowance.read',
    'hris.allowance.manage',
    'hris.recruitment.manage',
    'hris.kpi.read',
    'hris.kpi.assess',
    'hris.kpi.manage',
    'hris.org.read',
    'hris.self_service.read',
    'master_data.read',
    'finance.accounting.read'
  ],
  'Chief of Pilot': [
    'platform.dashboard.view',
    'flight.read',
    'hris.employee.read',
    'hris.certification.read',
    'hris.certification.manage',
    'hris.schedule.read',
    'hris.schedule.manage',
    'hris.kpi.read',
    'hris.kpi.assess',
    'hris.leave.read',
    'hris.leave.approve',
    'hris.overtime.approve',
    'hris.org.read',
    'hris.self_service.read',
    'master_data.read'
  ],
  Employee: [
    'platform.dashboard.view',
    'hris.self_service.read',
    'hris.leave.request',
    'hris.overtime.request',
    'hris.attendance.checkin'
  ]
};
