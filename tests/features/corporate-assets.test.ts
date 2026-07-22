import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from '../../server/db/migrate';
import { seedDemoData } from '../../server/db/seed';
import { seedFlightOperationsData } from '../../server/db/seed-flight-operations';
import { seedInventoryData } from '../../server/db/seeds/inventory';
import { seedCorporateAssets } from '../../server/db/seeds/corporate-assets';
import { CorporateAssetService } from '../../server/features/corporate-assets/service';
import { InventoryRepository } from '../../server/features/inventory/repository';
import { InventoryService } from '../../server/features/inventory/service';
import { createDbClient } from '../../server/db/client';

describe('Corporate Assets domain', () => {
  let sqlite: Database.Database;
  let assets: CorporateAssetService;
  let inventory: InventoryService;

  beforeEach(async () => {
    const client = createDbClient(':memory:');
    sqlite = client.sqlite;
    runMigrations(sqlite);
    await seedDemoData(client.db);
    seedFlightOperationsData(sqlite);
    seedInventoryData(sqlite);
    seedCorporateAssets(sqlite);
    assets = new CorporateAssetService(sqlite);
    inventory = new InventoryService(new InventoryRepository(sqlite));
  });

  it('migrates the aircraft-only maintenance issue shape to polymorphic targets', () => {
    sqlite.pragma('foreign_keys = OFF');
    sqlite.exec('DROP TABLE maintenance_part_issue_lines');
    sqlite.exec('DROP TABLE maintenance_part_issues');
    sqlite.exec(`CREATE TABLE maintenance_part_issues (
      id TEXT PRIMARY KEY, issue_number TEXT NOT NULL UNIQUE, maintenance_handoff_id TEXT,
      aircraft_id TEXT NOT NULL REFERENCES aircraft(id), flight_id TEXT,
      warehouse_id TEXT NOT NULL REFERENCES inventory_warehouses(id), reason TEXT NOT NULL,
      movement_id TEXT NOT NULL UNIQUE REFERENCES inventory_movements(id),
      status TEXT NOT NULL, total_parts_value_idr INTEGER NOT NULL,
      issued_by_user_id TEXT NOT NULL, issued_at TEXT NOT NULL)`);
    sqlite.exec(`CREATE TABLE maintenance_part_issue_lines (
      id TEXT PRIMARY KEY, issue_id TEXT NOT NULL REFERENCES maintenance_part_issues(id),
      part_id TEXT NOT NULL, quantity REAL NOT NULL, base_value_idr INTEGER NOT NULL, note TEXT)`);
    runMigrations(sqlite);
    const columns = sqlite.pragma('table_info(maintenance_part_issues)') as Array<{
      name: string;
      notnull: number;
    }>;
    expect(columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['target_type', 'target_id', 'asset_maintenance_work_order_id'])
    );
    expect(columns.find((column) => column.name === 'aircraft_id')?.notnull).toBe(0);
  });

  it('seeds consistent masters, operational stories, and Accounting projection', () => {
    expect(assets.listDepartments(true).map((item) => item.departmentCode)).toEqual([
      'FIN',
      'IT',
      'OPS'
    ]);
    expect(assets.listEmployees(true)).toHaveLength(3);
    const gpu = assets.getAsset('asset-gse-gpu-01', ['ALL'], true);
    expect(gpu.conditionStatus).toBe('UNDER_MAINTENANCE');
    expect(gpu.financial.assetNumber).toBe('FA-GSE-00001');
    expect(assets.getAsset('asset-it-laptop-01', ['ALL'], true).financial).toEqual({
      financialStatus: 'NOT_CAPITALIZED'
    });
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('generates category codes atomically and rejects duplicate serial numbers', () => {
    const base = {
      name: 'Demo monitor',
      category: 'IT_EQUIPMENT' as const,
      brand: null,
      model: null,
      serialNumber: 'MON-001',
      stationId: 'st-djj',
      locationType: 'STATION' as const,
      locationDetail: 'DJJ IT Store',
      departmentId: 'dept-it',
      currentCustodianEmployeeId: null,
      custodianNameSnapshot: null,
      acquisitionDate: null,
      acquisitionReference: null,
      lifecycleStatus: 'ACTIVE' as const,
      conditionStatus: 'SERVICEABLE' as const
    };
    expect(assets.createAsset(base, 'USR-DEMO-ADMIN', ['ALL']).assetCode).toBe('IT-00002');
    expect(() =>
      assets.createAsset({ ...base, name: 'Duplicate' }, 'USR-DEMO-ADMIN', ['ALL'])
    ).toThrow(/serial number already exists/u);
  });

  it('uses version as authority and treats expectedUpdatedAt as diagnostics only', () => {
    const before = assets.getAsset('asset-it-laptop-01', ['ALL'], true);
    const moved = assets.moveAsset(
      before.id,
      {
        expectedVersion: before.version,
        expectedUpdatedAt: '2000-01-01T00:00:00.000Z',
        toStationId: 'st-djj',
        toLocationType: 'DEPARTMENT',
        toLocation: 'Finance Department',
        newEmployeeId: null,
        newCustodianNameSnapshot: null,
        reason: 'Approved internal reassignment.',
        movedAt: '2026-07-22T10:00:00.000Z'
      },
      'USR-DEMO-ADMIN',
      ['ALL'],
      true
    );
    expect(moved.version).toBe(before.version + 1);
    try {
      assets.assignAsset(
        before.id,
        {
          expectedVersion: before.version,
          custodianNameSnapshot: 'Anisa Putri',
          employeeId: 'emp-anisa',
          departmentId: 'dept-it',
          reason: 'Stale assignment attempt.',
          startedAt: '2026-07-22T11:00:00.000Z'
        },
        'USR-DEMO-ADMIN',
        ['ALL']
      );
      throw new Error('Expected stale mutation to fail.');
    } catch (error) {
      expect(error).toMatchObject({ code: 'ASSET_VERSION_CONFLICT', statusCode: 409 });
    }
  });

  it('enforces station scope and cross-station movement rules', () => {
    expect(() => assets.getAsset('asset-gse-gpu-01', ['WMX'])).toThrow(
      /outside the active station scope/u
    );
    const vehicle = assets.getAsset('asset-vehicle-wmx-01', ['WMX']);
    try {
      assets.moveAsset(
        vehicle.id,
        {
          expectedVersion: vehicle.version,
          toStationId: 'st-djj',
          toLocationType: 'TRANSIT',
          toLocation: 'In transit to DJJ',
          newEmployeeId: null,
          newCustodianNameSnapshot: null,
          reason: 'Cross-station transfer.',
          movedAt: '2026-07-22T10:00:00.000Z'
        },
        'USR-STATION-ADMIN',
        ['WMX'],
        false
      );
      throw new Error('Expected cross-station movement to fail.');
    } catch (error) {
      expect(error).toMatchObject({ code: 'ASSET_CROSS_STATION_FORBIDDEN', statusCode: 403 });
    }
  });

  it('issues Inventory stock to a corporate work order and keeps reversal pipeline usable', async () => {
    const before = assets.getAsset('asset-gse-gpu-01', ['ALL']);
    const issue = await inventory.issueMaintenanceParts(
      {
        targetType: 'CORPORATE_ASSET',
        targetId: before.id,
        assetMaintenanceWorkOrderId: 'amw-demo-gpu',
        expectedAssetVersion: before.version,
        aircraftId: null,
        flightId: null,
        maintenanceHandoffId: null,
        warehouseId: 'inv-wh-djj-main',
        reason: 'Issue oil for GPU electrical maintenance test.',
        lines: [{ partId: 'inv-part-oil', quantity: 1, serialIds: [], note: null }]
      },
      'USR-MAINTENANCE-MANAGER',
      ['DJJ']
    );
    expect(issue?.targetType).toBe('CORPORATE_ASSET');
    expect(issue?.aircraftId).toBeNull();
    const work = assets.requireWorkOrder('amw-demo-gpu');
    expect(work.status).toBe('WAITING_PARTS');
    const movement = sqlite
      .prepare('SELECT id FROM inventory_movements WHERE source_id = ?')
      .get(issue?.id) as { id: string };
    await inventory.reverseMovement(movement.id, 'USR-INVENTORY-CONTROLLER', ['ALL']);
    expect(
      (
        sqlite
          .prepare('SELECT status FROM maintenance_part_issues WHERE id = ?')
          .get(issue?.id) as { status: string }
      ).status
    ).toBe('REVERSED');
  });
});
