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
});
