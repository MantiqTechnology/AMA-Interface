import { demoRolePermissions } from '#shared/types/roles';

const moduleCatalog = [
  { key: 'operations', name: 'Flight Operations', category: 'Operations' },
  { key: 'ticketing', name: 'Passenger & Cargo Ticketing', category: 'Commercial' },
  { key: 'finance', name: 'Finance & Billing', category: 'Finance' },
  { key: 'inventory', name: 'Inventory & Spare Parts', category: 'Operations' },
  { key: 'master-data', name: 'Master Data', category: 'Administration' }
];

export function useAuthorization() {
  const session = useDemoSession();

  function can(permissionId: string) {
    const permissions = demoRolePermissions[session.role.value];
    const allowed = permissions.includes('*') || permissions.includes(permissionId);
    return {
      allowed,
      message: allowed
        ? 'Allowed for the active demo role.'
        : `${session.role.value} does not have ${permissionId}.`,
      reason: allowed ? null : 'PERMISSION_DENIED'
    };
  }

  function explain(permissionId: string) {
    return can(permissionId).message;
  }

  function visibleModules() {
    if (session.role.value === 'Demo Admin') return moduleCatalog;
    return moduleCatalog.filter((module) => {
      if (module.key === 'operations') return can('flight.read').allowed;
      if (module.key === 'inventory') return can('inventory.read').allowed;
      if (module.key === 'master-data') return can('platform.module.manage').allowed;
      return true;
    });
  }

  function canAccessRecord(entityType: string) {
    return can(entityType === 'flightRequest' ? 'flight_request.read' : 'flight.read');
  }

  return { can, canAccessRecord, explain, visibleModules };
}
