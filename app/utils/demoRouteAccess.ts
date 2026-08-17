import { demoRolePermissions, type DemoRole } from '#shared/types/roles';

type RouteAccessRule = {
  prefix: string;
  all?: string[];
  any?: string[];
};

const routeAccessRules: RouteAccessRule[] = [
  { prefix: '/admin/access-demo', all: ['platform.module.manage'] },
  { prefix: '/asset-management/finance', all: ['asset.finance.read'] },
  { prefix: '/asset-management', all: ['asset.read'] },
  { prefix: '/finance', all: ['finance.accounting.read'] },
  { prefix: '/invoices', all: ['finance.invoice.read'] },
  { prefix: '/inventory', all: ['inventory.read'] },
  { prefix: '/maintenance', all: ['maintenance.package.read'] },
  {
    prefix: '/marketing/contracts-subsidies',
    any: ['commercial.contract.read', 'platform.module.manage']
  },
  { prefix: '/master-data/routes', any: ['master_data.read', 'platform.module.manage'] },
  { prefix: '/master-data', all: ['platform.module.manage'] },
  { prefix: '/ops', all: ['flight.read'] },
  { prefix: '/ops/flight-following', all: ['flight.read'] },
  { prefix: '/ops/flights', all: ['flight.read'] },
  { prefix: '/ops/flight-closure', all: ['flight.read'] },
  { prefix: '/flights/requests', all: ['flight_request.read'] },
  { prefix: '/flights/readiness', all: ['readiness.view'] },
  { prefix: '/flights/manifest', all: ['flight.manifest.view'] },
  { prefix: '/flights/fuel', all: ['flight.read', 'flight.fuel.update'] },
  { prefix: '/flights/station-operations', all: ['station.task.view'] },
  { prefix: '/flights/actual-closure', all: ['station.task.view'] },
  {
    prefix: '/flights/maintenance',
    any: ['station.task.view', 'maintenance.package.read']
  },
  { prefix: '/flights', all: ['flight.read'] }
];

const publicRoutePrefixes = ['/', '/dashboard', '/ticketing', '/uploads'];

function pathMatchesPrefix(path: string, prefix: string) {
  if (prefix === '/') return path === '/';
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function demoRoleHasPermission(role: DemoRole, permissionId: string) {
  const permissions = demoRolePermissions[role];
  return permissions.includes('*') || permissions.includes(permissionId);
}

export function canDemoRoleAccessPath(role: DemoRole, path: string) {
  if (publicRoutePrefixes.some((prefix) => pathMatchesPrefix(path, prefix))) return true;

  const rule = routeAccessRules.find((candidate) => pathMatchesPrefix(path, candidate.prefix));
  if (!rule) return true;

  const allAllowed = rule.all?.every((permissionId) => demoRoleHasPermission(role, permissionId));
  const anyAllowed = rule.any?.some((permissionId) => demoRoleHasPermission(role, permissionId));

  return Boolean(allAllowed ?? anyAllowed ?? true);
}

export function safeDemoRoleRedirectPath(role: DemoRole, path: string) {
  return canDemoRoleAccessPath(role, path) ? null : '/dashboard';
}
