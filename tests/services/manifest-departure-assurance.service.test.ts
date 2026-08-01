import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

const stationAdmin = {
  userId: 'USR-STATION-ADMIN',
  role: 'Station Admin',
  stationCodes: ['ALL']
};
const occ = {
  userId: 'USR-001',
  role: 'OCC',
  stationCodes: ['ALL']
};

function satisfyOriginAssurance(
  sqlite: Awaited<ReturnType<typeof createSeededTestServices>>['sqlite']
) {
  const now = new Date().toISOString();
  sqlite
    .prepare(
      `UPDATE flight_manifests
       SET status_id = 'manifest-status-locked', locked_at = ?, locked_by_user_id = 'USR-001'
       WHERE id = 'fop-checkin-open-manifest-pax'`
    )
    .run(now);
  sqlite
    .prepare(
      `UPDATE flight_station_tasks
       SET status = 'VERIFIED', verified_by_user_id = 'USR-STATION-ADMIN',
           verified_at = ?, updated_at = ?
       WHERE flight_id = 'fop-checkin-open' AND station_id = 'st-djj'`
    )
    .run(now, now);
  const signoff = sqlite
    .prepare(
      `SELECT id FROM flight_station_tasks
       WHERE flight_id = 'fop-checkin-open' AND task_code = 'ORIGIN_STATION_SIGNOFF'`
    )
    .get() as { id: string };
  for (const [stage, actor, role] of [
    ['STATION', 'USR-STATION-ADMIN', 'Station Admin'],
    ['OCC', 'USR-001', 'OCC']
  ]) {
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO flight_station_task_approvals (
           id, task_id, approval_stage, decision, actor_user_id, actor_role,
           approved_at, created_at, updated_at
         ) VALUES (?, ?, ?, 'APPROVED', ?, ?, ?, ?, ?)`
      )
      .run(`approval-test-${stage}`, signoff.id, stage, actor, role, now, now, now);
  }
  sqlite
    .prepare(
      `UPDATE flight_fuel_requests
       SET status_id = 'fuel-workflow-status-posted', updated_at = ?
       WHERE flight_id = 'fop-checkin-open'`
    )
    .run(now);
}

describe('manifest and departure assurance', () => {
  it('uses the explicit check-in closed state and manifest version workflow', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite
      .prepare(
        `UPDATE flight_manifests
         SET status_id = 'manifest-status-draft', approved_by_user_id = NULL, approved_at = NULL
         WHERE id = 'fop-checkin-open-manifest-pax'`
      )
      .run();
    const initial = services.flightOperations.detail('fop-checkin-open');

    const closed = services.flightOperations.closeCheckIn(
      initial.id,
      { expectedUpdatedAt: initial.updatedAt, note: 'Counter and load intake finalized.' },
      stationAdmin
    );
    expect(closed.currentStatus).toBe('CHECK_IN_CLOSED');

    const passenger = closed.manifests.find((manifest) => manifest.manifestType === 'PASSENGER')!;
    const submitted = services.flightOperations.submitManifest(
      passenger.id,
      { expectedVersion: passenger.version },
      stationAdmin
    );
    const submittedPassenger = submitted.manifests.find(
      (manifest) => manifest.id === passenger.id
    )!;
    expect(submittedPassenger.status).toBe('SUBMITTED');
    expect(submittedPassenger.version).toBe(passenger.version + 1);

    const approved = services.flightOperations.approveManifest(
      passenger.id,
      submittedPassenger.version,
      occ
    );
    const approvedPassenger = approved.manifests.find((manifest) => manifest.id === passenger.id)!;
    expect(approvedPassenger.status).toBe('APPROVED');

    const locked = services.flightOperations.lockManifest(
      passenger.id,
      approvedPassenger.version,
      occ
    );
    expect(locked.manifests.find((manifest) => manifest.id === passenger.id)).toMatchObject({
      status: 'LOCKED',
      version: approvedPassenger.version + 1,
      lockedByUserId: occ.userId
    });

    sqlite.close();
  });

  it('rejects stale manifest commands without partial updates', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite
      .prepare(
        `UPDATE flight_manifests
         SET status_id = 'manifest-status-draft', approved_by_user_id = NULL, approved_at = NULL
         WHERE id = 'fop-checkin-open-manifest-pax'`
      )
      .run();
    const initial = services.flightOperations.detail('fop-checkin-open');
    const closed = services.flightOperations.closeCheckIn(
      initial.id,
      { expectedUpdatedAt: initial.updatedAt },
      stationAdmin
    );
    const passenger = closed.manifests.find((manifest) => manifest.manifestType === 'PASSENGER')!;
    services.flightOperations.submitManifest(
      passenger.id,
      { expectedVersion: passenger.version },
      stationAdmin
    );

    expect(() =>
      services.flightOperations.submitManifest(
        passenger.id,
        { expectedVersion: passenger.version },
        stationAdmin
      )
    ).toThrow(/Manifest changed/);
    expect(
      services.flightOperations
        .detail(initial.id)
        .manifests.find((manifest) => manifest.id === passenger.id)?.status
    ).toBe('SUBMITTED');

    sqlite.close();
  });

  it('keeps departure blocked until origin assurance gates pass', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const initial = services.flightOperations.detail('fop-checkin-open');
    const closed = services.flightOperations.closeCheckIn(
      initial.id,
      { expectedUpdatedAt: initial.updatedAt },
      stationAdmin
    );

    expect(() =>
      services.flightOperations.markReadyForDeparture(
        initial.id,
        { expectedUpdatedAt: closed.updatedAt },
        occ
      )
    ).toThrow(/blocking requirements/);
    expect(services.flightOperations.detail(initial.id).currentStatus).toBe('CHECK_IN_CLOSED');

    sqlite.close();
  });

  it('persists OCC dangerous-goods decision and evidence on the manifest version', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const cargo = sqlite
      .prepare(
        `SELECT cargo.id, manifest.version
         FROM flight_manifest_cargo_items cargo
         JOIN flight_manifests manifest ON manifest.id = cargo.manifest_id
         WHERE cargo.id = 'fop-dg-cargo-1'`
      )
      .get() as { id: string; version: number };

    const workspace = services.flightOperations.decideDangerousGoods(
      cargo.id,
      {
        expectedVersion: cargo.version,
        decision: 'ACCEPTED',
        reason: 'Packaging and declaration reviewed.',
        evidenceIds: ['upload-dg-declaration']
      },
      occ
    );
    expect(workspace.cargo.find((item) => item.id === cargo.id)).toMatchObject({
      dgAcceptanceStatus: 'ACCEPTED',
      dgDecisionByUserId: occ.userId,
      dgEvidenceIds: ['upload-dg-declaration']
    });

    sqlite.close();
  });

  it('moves a fully assured flight to ready and revalidates critical sources before depart', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const initial = services.flightOperations.detail('fop-checkin-open');
    const closed = services.flightOperations.closeCheckIn(
      initial.id,
      { expectedUpdatedAt: initial.updatedAt },
      stationAdmin
    );
    services.flightOperations.evaluateDepartureAssurance(initial.id, occ);
    satisfyOriginAssurance(sqlite);

    const ready = services.flightOperations.markReadyForDeparture(
      initial.id,
      { expectedUpdatedAt: closed.updatedAt },
      occ
    );
    expect(ready.currentStatus).toBe('READY_FOR_DEPARTURE');

    sqlite
      .prepare(
        `UPDATE aircraft
         SET serviceability_status = 'UNSERVICEABLE'
         WHERE id = ?`
      )
      .run(ready.aircraftId);
    expect(() =>
      services.flightOperations.departWithCriticalRevalidation(
        initial.id,
        { actualAt: new Date().toISOString(), stationId: ready.originStationId },
        occ.userId
      )
    ).toThrow(/critical readiness checks failed/);
    expect(services.flightOperations.detail(initial.id).currentStatus).toBe('READY_FOR_DEPARTURE');

    sqlite.close();
  });
});
