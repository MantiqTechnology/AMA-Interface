import { describe, expect, it } from 'vitest';
import { demoRolePermissions } from '../shared/types/roles';

describe('material workflow permission segregation', () => {
  it('keeps Station, MRO, and Inventory actions separated', () => {
    expect(demoRolePermissions['Station Admin']).toContain('station.maintenance_request.create');
    expect(demoRolePermissions['Station Admin']).not.toContain('maintenance.material.request');

    expect(demoRolePermissions['Maintenance Manager']).toContain('maintenance.material.request');
    expect(demoRolePermissions['Maintenance Manager']).not.toContain('inventory.material.reserve');

    expect(demoRolePermissions['Maintenance Technician']).toContain('maintenance.material.install');
    expect(demoRolePermissions['Maintenance Technician']).not.toContain('inventory.material.issue');

    expect(demoRolePermissions['Inventory Controller']).toEqual(
      expect.arrayContaining([
        'inventory.maintenance_demand.read',
        'inventory.material.reserve',
        'inventory.material.issue',
        'inventory.material.return'
      ])
    );
    expect(demoRolePermissions['Inventory Controller']).not.toContain(
      'maintenance.material.install'
    );
  });
});
