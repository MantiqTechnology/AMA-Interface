import { describe, expect, it } from 'vitest';
import {
  canDemoRoleAccessPath,
  demoRoleHasPermission,
  safeDemoRoleRedirectPath
} from '../app/utils/demoRouteAccess';

describe('demo route access', () => {
  it('allows public and dashboard routes for scoped roles', () => {
    expect(canDemoRoleAccessPath('Inventory Controller', '/dashboard')).toBe(true);
    expect(canDemoRoleAccessPath('Inventory Controller', '/login')).toBe(true);
  });

  it('redirects roles away from routes outside their permission scope', () => {
    expect(safeDemoRoleRedirectPath('Inventory Controller', '/flights/station-operations')).toBe(
      '/dashboard'
    );
    expect(safeDemoRoleRedirectPath('Finance Reviewer', '/admin/access-demo')).toBe('/dashboard');
  });

  it('allows routes when the role has the required permission', () => {
    expect(safeDemoRoleRedirectPath('Demo Admin', '/admin/access-demo')).toBeNull();
    expect(safeDemoRoleRedirectPath('OCC', '/master-data/routes')).toBeNull();
    expect(safeDemoRoleRedirectPath('OCC', '/ops')).toBeNull();
    expect(safeDemoRoleRedirectPath('OCC', '/flights/dashboard')).toBeNull();
    expect(safeDemoRoleRedirectPath('Director', '/asset-management/overview')).toBeNull();
    expect(safeDemoRoleRedirectPath('Station Admin', '/asset-management/register')).toBeNull();
    expect(safeDemoRoleRedirectPath('Finance Reviewer', '/asset-management/finance')).toBeNull();
    expect(safeDemoRoleRedirectPath('Inventory Controller', '/ops')).toBe('/dashboard');
  });

  it('allows the restored demo modules', () => {
    expect(safeDemoRoleRedirectPath('Demo Admin', '/ticketing/passenger')).toBeNull();
    expect(safeDemoRoleRedirectPath('Station Admin', '/crm-marketing/leads')).toBeNull();
    expect(safeDemoRoleRedirectPath('HR Manager', '/hris')).toBeNull();
    expect(safeDemoRoleRedirectPath('Inventory Controller', '/hris')).toBeNull();
    expect(safeDemoRoleRedirectPath('Inventory Controller', '/uploads')).toBeNull();
    expect(safeDemoRoleRedirectPath('HR Staff', '/careers')).toBeNull();
    expect(safeDemoRoleRedirectPath('OCC', '/careers')).toBeNull();
  });

  it('gives Director read-only visibility across every HRIS submenu', () => {
    const readPermissions = [
      'hris.employee.read',
      'hris.org.read',
      'hris.certification.read',
      'hris.attendance.read',
      'hris.leave.read',
      'hris.schedule.read',
      'hris.payroll.read',
      'hris.allowance.read',
      'hris.recruitment.read',
      'hris.kpi.read',
      'hris.self_service.read'
    ];

    expect(
      readPermissions.every((permission) => demoRoleHasPermission('Director', permission))
    ).toBe(true);
    const mutationPermissions = [
      'hris.employee.manage',
      'hris.employee.import',
      'hris.certification.manage',
      'hris.attendance.manage',
      'hris.attendance.checkin',
      'hris.leave.request',
      'hris.leave.approve',
      'hris.overtime.request',
      'hris.overtime.approve',
      'hris.schedule.manage',
      'hris.payroll.manage',
      'hris.payroll.calculate',
      'hris.payroll.approve',
      'hris.payroll.journal',
      'hris.allowance.manage',
      'hris.recruitment.manage',
      'hris.kpi.manage',
      'hris.kpi.assess'
    ];
    expect(
      mutationPermissions.every((permission) => !demoRoleHasPermission('Director', permission))
    ).toBe(true);
  });

  it('keeps Corporate Assets scoped by asset permissions', () => {
    expect(safeDemoRoleRedirectPath('OCC', '/asset-management/overview')).toBe('/dashboard');
    expect(safeDemoRoleRedirectPath('OCC', '/asset-management/assets/asset-gse-gpu-01')).toBe(
      '/dashboard'
    );
    expect(safeDemoRoleRedirectPath('Station Admin', '/asset-management/finance')).toBe(
      '/dashboard'
    );
  });

  it('limits the station network dashboard to Director and Demo Admin', () => {
    expect(safeDemoRoleRedirectPath('Director', '/flights/station-operations/network')).toBeNull();
    expect(
      safeDemoRoleRedirectPath('Demo Admin', '/flights/station-operations/network')
    ).toBeNull();
    expect(safeDemoRoleRedirectPath('Station Admin', '/flights/station-operations/network')).toBe(
      '/dashboard'
    );
    expect(
      safeDemoRoleRedirectPath('Finance Reviewer', '/flights/station-operations/network')
    ).toBe('/dashboard');
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

  it('separates Station technical handoff from the MRO approval workbench', () => {
    expect(
      safeDemoRoleRedirectPath('Station Admin', '/flights/station-operations/maintenance')
    ).toBeNull();
    expect(safeDemoRoleRedirectPath('Station Admin', '/flights/maintenance')).toBeNull();
    expect(safeDemoRoleRedirectPath('Maintenance Manager', '/flights/maintenance')).toBeNull();
    expect(safeDemoRoleRedirectPath('Station Admin', '/maintenance/flight-handoffs')).toBe(
      '/dashboard'
    );
    expect(
      safeDemoRoleRedirectPath('Maintenance Manager', '/maintenance/flight-handoffs')
    ).toBeNull();
  });
});
