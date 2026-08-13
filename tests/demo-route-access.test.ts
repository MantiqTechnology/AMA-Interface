import { describe, expect, it } from 'vitest';
import { canDemoRoleAccessPath, safeDemoRoleRedirectPath } from '../app/utils/demoRouteAccess';

describe('demo route access', () => {
  it('allows public and dashboard routes for scoped roles', () => {
    expect(canDemoRoleAccessPath('Inventory Controller', '/dashboard')).toBe(true);
    expect(canDemoRoleAccessPath('Inventory Controller', '/ticketing/passenger')).toBe(true);
  });

  it('redirects roles away from routes outside their permission scope', () => {
    expect(safeDemoRoleRedirectPath('Inventory Controller', '/flights/station-operations')).toBe(
      '/dashboard'
    );
    expect(safeDemoRoleRedirectPath('Maintenance Manager', '/asset-management/finance')).toBe(
      '/dashboard'
    );
    expect(safeDemoRoleRedirectPath('Finance Reviewer', '/admin/access-demo')).toBe('/dashboard');
  });

  it('allows routes when the role has the required permission', () => {
    expect(safeDemoRoleRedirectPath('Demo Admin', '/admin/access-demo')).toBeNull();
    expect(safeDemoRoleRedirectPath('Finance Reviewer', '/asset-management/finance')).toBeNull();
    expect(safeDemoRoleRedirectPath('OCC', '/master-data/routes')).toBeNull();
  });

  it('keeps MRO routes read-scoped and role-change redirect safe', () => {
    expect(safeDemoRoleRedirectPath('Maintenance Manager', '/maintenance')).toBeNull();
    expect(safeDemoRoleRedirectPath('Maintenance Technician', '/maintenance/my-work')).toBeNull();
    expect(safeDemoRoleRedirectPath('Certifying Staff', '/maintenance/releases')).toBeNull();
    expect(safeDemoRoleRedirectPath('Finance Reviewer', '/maintenance/records')).toBeNull();
    expect(safeDemoRoleRedirectPath('Maintenance Technician', '/admin/access-demo')).toBe(
      '/dashboard'
    );
    expect(safeDemoRoleRedirectPath('OCC', '/maintenance/work-packages')).toBe('/dashboard');
    expect(safeDemoRoleRedirectPath('Inventory Controller', '/maintenance')).toBe('/dashboard');
  });
});
