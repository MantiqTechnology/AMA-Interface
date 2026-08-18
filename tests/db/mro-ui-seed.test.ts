import { rm } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, resolveDbPath } from '../../server/db/client';
import { resetDemoDatabase } from '../../server/db/reset-demo';

const dbPath = './data/test-mro-ui-seed.sqlite';

beforeAll(async () => {
  await resetDemoDatabase(dbPath, { anchorDate: '2026-08-01', resetDocuments: false });
});

afterAll(async () => {
  const resolved = resolveDbPath(dbPath);
  await rm(resolved, { force: true });
  await rm(`${resolved}-wal`, { force: true });
  await rm(`${resolved}-shm`, { force: true });
});

describe('MRO UI alignment seed', () => {
  it('seeds deterministic golden-path maintenance records without breaking reserve aircraft', () => {
    const sqlite = createDbClient(dbPath).sqlite;

    expect(
      sqlite
        .prepare(
          `SELECT registration_number AS registrationNumber, serviceability_status AS status
           FROM aircraft
           WHERE id IN ('ac-pk-amf', 'ac-pk-amg', 'ac-pk-amh')
           ORDER BY id`
        )
        .all()
    ).toEqual([
      { registrationNumber: 'PK-AMF', status: 'SERVICEABLE' },
      { registrationNumber: 'PK-AMG', status: 'SERVICEABLE' },
      { registrationNumber: 'PK-AMH', status: 'SERVICEABLE' }
    ]);

    expect(
      sqlite
        .prepare(
          `SELECT package_number AS packageNumber, status, aircraft_id AS aircraftId
           FROM maintenance_work_packages
           WHERE id IN ('mwp-mrov1-active', 'mwp-mrov1-release-ready', 'mwp-mrov1-history')
           ORDER BY package_number`
        )
        .all()
    ).toEqual([
      {
        packageNumber: 'MWP-MROV1-ACTIVE',
        status: 'IN_PROGRESS',
        aircraftId: 'ac-pk-amc'
      },
      { packageNumber: 'MWP-MROV1-HIST', status: 'RELEASED', aircraftId: 'ac-pk-ama' },
      {
        packageNumber: 'MWP-MROV1-RTS',
        status: 'READY_FOR_RELEASE',
        aircraftId: 'ac-pk-mra'
      }
    ]);

    expect(
      sqlite
        .prepare(
          `SELECT license_number AS licenseNumber, status
           FROM personnel_licenses
           WHERE personnel_id = 'crew-certifying-staff'
           ORDER BY license_number`
        )
        .all()
    ).toEqual([
      { licenseNumber: 'AME-CERT-MRO-001', status: 'ACTIVE' },
      { licenseNumber: 'AME-CERT-MRO-EXPIRED', status: 'EXPIRED' }
    ]);

    expect(
      sqlite
        .prepare(
          `SELECT signer_authorization_snapshot_json IS NOT NULL AS hasSnapshot
           FROM aircraft_maintenance_releases
           WHERE release_number = 'RTS-MROV1-HIST-001'`
        )
        .get()
    ).toEqual({ hasSnapshot: 1 });

    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    sqlite.close();
  });

  it('seeds the Internal AOG material scenario at its deterministic blocked baseline', () => {
    const sqlite = createDbClient(dbPath).sqlite;

    expect(
      sqlite
        .prepare(
          `SELECT wp.package_number AS packageNumber,
                  wp.status,
                  a.registration_number AS registrationNumber,
                  mr.status AS materialStatus,
                  mr.required_quantity AS requiredQuantity,
                  COALESCE((
                    SELECT SUM(r.issued_quantity)
                    FROM maintenance_inventory_reservations r
                    WHERE r.material_requirement_id = mr.id
                  ), 0) AS issuedQuantity
           FROM maintenance_work_packages wp
           JOIN aircraft a ON a.id = wp.aircraft_id
           JOIN maintenance_work_package_material_requirements mr ON mr.work_package_id = wp.id
           WHERE wp.id = 'mroaog-work-package'`
        )
        .get()
    ).toEqual({
      packageNumber: 'MWP-AOG-INT-001',
      status: 'IN_PROGRESS',
      registrationNumber: 'PK-AMD',
      materialStatus: 'REQUESTED',
      requiredQuantity: 1,
      issuedQuantity: 0
    });

    expect(
      sqlite
        .prepare(
          `SELECT status,
                  requires_independent_inspection AS requiresIndependentInspection
           FROM maintenance_job_cards
           WHERE id = 'mroaog-job-card'`
        )
        .get()
    ).toEqual({ status: 'READY', requiresIndependentInspection: 1 });

    expect(
      sqlite
        .prepare(
          `SELECT on_hand_quantity AS quantity
           FROM inventory_stock_balances
           WHERE id = 'inv-bal-tire-c208-reserve'
             AND condition = 'SERVICEABLE'`
        )
        .get()
    ).toEqual({ quantity: 4 });

    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    sqlite.close();
  });
});
