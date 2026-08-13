import type Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { seedMroFoundationData } from '../../server/db/seeds/mro-foundation';
import { seedMroV21Foundation } from '../../server/db/seeds/mro-v21-foundation';
import { createSeededTestServices } from '../helpers/demo-db';

const actor = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager'
};

const materialRequirementStatuses = [
  'REQUESTED',
  'RESERVED',
  'ALLOCATED',
  'ISSUED',
  'NOT_REQUIRED',
  'BLOCKED'
];

async function createResourceFixture() {
  const fixture = await createSeededTestServices();
  const context = createDemoSeedContext();
  seedMroFoundationData(fixture.sqlite);
  seedMroV21Foundation(fixture.sqlite, context);
  return fixture;
}

function expectInventoryLegacyTablesAbsent(sqlite: Database.Database) {
  const legacyTables = sqlite
    .prepare(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table' AND name IN ('parts', 'serialized_parts', 'inventory_locations')`
    )
    .all() as Array<{ name: string }>;

  expect(legacyTables).toEqual([]);
}

describe('Resource-v21 integrity contracts', () => {
  it('returns resource readiness for a valid work package', async () => {
    const { services, sqlite } = await createResourceFixture();

    const readiness = services.resourceV21.getResourceReadiness('mwp-mrov1-release-ready');

    expect(readiness.workPackageId).toBe('mwp-mrov1-release-ready');
    expect(readiness.material.requirements.length).toBeGreaterThan(0);
    expect(readiness.tools.requirements.length).toBeGreaterThan(0);
    expect(readiness.personnel.requirements.length).toBeGreaterThan(0);
    expect(readiness.material.ready).toBe(true);
    expect(readiness.tools.ready).toBe(true);
    expect(readiness.personnel.ready).toBe(true);

    sqlite.close();
  });

  it('returns a domain error for an invalid readiness work package', async () => {
    const { services, sqlite } = await createResourceFixture();

    expect(() => services.resourceV21.getResourceReadiness('mwp-does-not-exist')).toThrow(
      /not found/i
    );

    sqlite.close();
  });

  it('calculates material ATP from the actual inventory schema', async () => {
    const { services, sqlite } = await createResourceFixture();
    expectInventoryLegacyTablesAbsent(sqlite);

    const atp = services.resourceV21.calculateAtp('inv-part-filter-c208-reserve', 'st-bik');
    const stock = sqlite
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN stock.condition = 'SERVICEABLE' THEN stock.on_hand_quantity ELSE 0 END), 0) AS serviceable_on_hand,
           COALESCE(SUM(CASE WHEN stock.condition = 'QUARANTINE' THEN stock.on_hand_quantity ELSE 0 END), 0) AS quarantined,
           COALESCE(SUM(CASE WHEN stock.condition NOT IN ('SERVICEABLE', 'QUARANTINE') THEN stock.on_hand_quantity ELSE 0 END), 0) AS restricted
         FROM inventory_stock_balances stock
         JOIN inventory_bins bin ON bin.id = stock.bin_id
         JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
         WHERE stock.part_id = ? AND warehouse.station_id = ?`
      )
      .get('inv-part-filter-c208-reserve', 'st-bik') as {
      serviceable_on_hand: number;
      quarantined: number;
      restricted: number;
    };

    expect(atp.partNumber).toBe('SP-C208-FLT-4101');
    expect(atp.serviceableOnHand).toBe(stock.serviceable_on_hand);
    expect(atp.quarantinedQuantity).toBe(stock.quarantined);
    expect(atp.restrictedQuantity).toBe(stock.restricted);

    sqlite.close();
  });

  it('keeps ATP quantity values internally consistent', async () => {
    const { services, sqlite } = await createResourceFixture();

    const atp = services.resourceV21.calculateAtp('inv-part-filter-c208-reserve', 'st-bik');

    expect(atp.serviceableOnHand).toBeGreaterThanOrEqual(0);
    expect(atp.activeReservations).toBeGreaterThanOrEqual(0);
    expect(atp.availableToPromise).toBe(
      Math.max(0, atp.serviceableOnHand - atp.activeReservations)
    );
    expect(atp.availableToPromise).toBeLessThanOrEqual(atp.serviceableOnHand);

    sqlite.close();
  });

  it('loads and creates material requirements using DB-accepted states', async () => {
    const { services, sqlite } = await createResourceFixture();

    const existing = services.resourceV21.listMaterialRequirements('mwp-mrov21-conflict');
    expect(existing).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          partId: 'inv-part-filter-c208-reserve',
          status: 'REQUESTED',
          partNumber: 'SP-C208-FLT-4101'
        })
      ])
    );

    const created = services.resourceV21.createMaterialRequirement(
      {
        workPackageId: 'mwp-mrov21-conflict',
        partId: 'inv-part-tire-c208-reserve',
        requiredQuantity: 1,
        unit: 'EA',
        requestedStationId: 'st-bik',
        reason: 'M1 regression user-created requirement'
      },
      actor
    );

    expect(created.status).toBe('REQUESTED');
    const stored = sqlite
      .prepare('SELECT status FROM maintenance_work_package_material_requirements WHERE id = ?')
      .get(created.id) as { status: string };
    expect(materialRequirementStatuses).toContain(stored.status);

    sqlite.close();
  });

  it('rejects package-scoped mutations for resources from another work package', async () => {
    const { services, sqlite } = await createResourceFixture();

    expect(() =>
      services.resourceV21.reserveMaterial(
        {
          materialRequirementId: 'mmat-conflict-filter',
          inventoryItemId: 'inv-part-filter-c208-reserve',
          quantity: 1,
          unit: 'EA',
          stationId: 'st-bik',
          idempotencyKey: 'm1-cross-package-reservation'
        },
        actor,
        'mwp-mrov1-release-ready'
      )
    ).toThrow(/does not belong/u);

    sqlite.close();
  });

  it('projects seeded M2 material lifecycle without false readiness', async () => {
    const { services, sqlite } = await createResourceFixture();

    const [requirement] = services.resourceV21.listMaterialRequirements('mwp-mrov1-release-ready');
    expect(requirement).toMatchObject({
      status: 'ISSUED',
      lifecycleStatus: 'INSTALLED',
      satisfied: true,
      installedQuantity: 1
    });
    const trace = services.resourceV21.listMaterialTraceability(
      'mwp-mrov1-release-ready',
      requirement!.id
    );
    expect(trace[0]?.traceComplete).toBe(true);
    expect(trace[0]?.installations[0]).toMatchObject({
      reservationId: 'res-release-filter',
      issueId: 'inv-issue-mro-release-filter',
      workPackageId: 'mwp-mrov1-release-ready'
    });

    sqlite.close();
  });

  it('returns tool resource requirements and allocations with valid states', async () => {
    const { services, sqlite } = await createResourceFixture();

    const requirements = services.resourceV21.listToolRequirements('mwp-mrov1-release-ready');
    const allocations = services.resourceV21.listToolAllocations('mwp-mrov1-release-ready');

    expect(requirements).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'ALLOCATED' })])
    );
    expect(allocations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'ALLOCATED',
          calibrationRequired: true
        })
      ])
    );

    sqlite.close();
  });

  it('returns personnel requirements and assignments with backend eligibility facts', async () => {
    const { services, sqlite } = await createResourceFixture();

    const requirements = services.resourceV21.listPersonnelRequirements('mwp-mrov1-release-ready');
    const assignments = services.resourceV21.listPersonnelAssignments('mwp-mrov1-release-ready');

    expect(requirements.length).toBeGreaterThanOrEqual(2);
    expect(assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          roleType: 'MECHANIC',
          eligibilityStatus: 'ELIGIBLE'
        }),
        expect.objectContaining({
          roleType: 'INSPECTOR',
          eligibilityStatus: 'ELIGIBLE'
        })
      ])
    );

    sqlite.close();
  });
});
