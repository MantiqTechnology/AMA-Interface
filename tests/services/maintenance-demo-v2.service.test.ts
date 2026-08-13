import { describe, expect, it } from 'vitest';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { seedMroFoundationData } from '../../server/db/seeds/mro-foundation';
import { seedMroV21Foundation } from '../../server/db/seeds/mro-v21-foundation';
import { createSeededTestServices } from '../helpers/demo-db';

const context = createDemoSeedContext();
const maintenance = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager',
  requestId: 'test-mro-demo-v2'
};
const technician = {
  userId: 'USR-MAINTENANCE-TECHNICIAN',
  role: 'Maintenance Technician',
  requestId: 'test-mro-demo-v2-technician'
};

describe('Maintenance Demo-v2 controls', () => {
  it('makes maintenance audit logs append-only at database level', async () => {
    const { sqlite } = await createSeededTestServices();
    seedMroFoundationData(sqlite);

    sqlite
      .prepare(
        `INSERT INTO maintenance_audit_logs (
          id, entity_type, entity_id, action, actor_user_id, actor_role, metadata_json, occurred_at
        ) VALUES ('maudit-demo-v2-trigger', 'WORK_PACKAGE', 'mwp-mrov1-active', 'TEST',
          'TEST', 'TEST', '{}', '2026-07-17T00:00:00.000Z')`
      )
      .run();

    expect(() =>
      sqlite
        .prepare("UPDATE maintenance_audit_logs SET action = 'TAMPERED' WHERE id = ?")
        .run('maudit-demo-v2-trigger')
    ).toThrow(/append-only/u);
    expect(() =>
      sqlite
        .prepare('DELETE FROM maintenance_audit_logs WHERE id = ?')
        .run('maudit-demo-v2-trigger')
    ).toThrow(/append-only/u);

    sqlite.close();
  });

  it('evaluates release eligibility separately from execution resource readiness', async () => {
    const { services, sqlite } = await createSeededTestServices();
    seedMroFoundationData(sqlite);
    seedMroV21Foundation(sqlite, context);

    const ready = services.maintenance.evaluateReleaseEligibility('mwp-mrov1-release-ready');
    expect(ready.eligible).toBe(true);
    expect(ready.blockers).toEqual([]);

    const blocked = services.maintenance.evaluateReleaseEligibility('mwp-mrov1-active');
    expect(blocked.eligible).toBe(false);
    expect(blocked.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'APPROVED_DATA_REVISION_INACTIVE',
        'MANDATORY_MAINTENANCE_OVERDUE',
        'MATERIAL_NOT_RESERVED',
        'AMO_SCOPE_MISMATCH'
      ])
    );
    expect(blocked.blockers.map((item) => item.code)).not.toContain('TOOL_CALIBRATION_EXPIRED');

    const executionReadiness = services.resourceV21.evaluateMroEligibility('mwp-mrov1-active');
    expect(executionReadiness.blockers.map((item) => item.category)).toContain('TOOL');
    expect(executionReadiness.blockers.map((item) => item.code)).toContain('TOOL_NOT_ALLOCATED');

    sqlite.close();
  });

  it('exposes and accepts a dedicated technician licence for mechanic sign-off demos', async () => {
    const { services, sqlite } = await createSeededTestServices();
    seedMroFoundationData(sqlite);

    const selectorData = services.maintenance.selectorData(technician);

    expect(selectorData.signerLicenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          personnelName: 'Dian Pratama',
          licenseNumber: 'AME-TECH-MRO-001',
          isUsableNow: true
        })
      ])
    );
    sqlite
      .prepare(
        `INSERT INTO maintenance_job_cards (
          id, work_package_id, card_number, title, task_type, maintenance_data_ref,
          maintenance_data_revision, mandatory_flag, requires_independent_inspection,
          status, version, created_by_user_id, created_at, updated_at
        ) VALUES (
          'mjc-mrov2-technician-signoff', 'mwp-mrov1-active', 'MWP-MROV2-TECH-JC-001',
          'Technician sign-off authorization sample', 'DEFECT_RECTIFICATION',
          'AMM PAC750XL 77-30-00', 'REV-MROV2-ACTIVE', 0, 0, 'READY', 1,
          'USR-MAINTENANCE-MANAGER', '2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.000Z'
        )`
      )
      .run();

    const signed = services.maintenance.signWork(
      'mjc-mrov2-technician-signoff',
      {
        expectedVersion: 1,
        certifyingLicenseNumber: 'AME-TECH-MRO-001',
        statement: 'Technician completed sample mechanic work for Demo-v2.',
        evidenceReferences: ['MROV2-TECH-SIGNOFF-EVIDENCE']
      },
      technician
    );

    const signedCard = signed.jobCards.find((card) => card.id === 'mjc-mrov2-technician-signoff');
    expect(signedCard).toMatchObject({ status: 'READY_FOR_RELEASE_REVIEW' });
    expect(signedCard?.signoffs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signoffType: 'MECHANIC',
          actorUserId: 'USR-MAINTENANCE-TECHNICIAN',
          certifyingLicenseNumber: 'AME-TECH-MRO-001'
        })
      ])
    );

    sqlite.close();
  });

  it('creates a stable demo audit pack with required disclaimer and manifest hash', async () => {
    const { services, sqlite } = await createSeededTestServices();
    seedMroFoundationData(sqlite);

    const pack = services.maintenance.getAuditPack('mwp-mrov1-release-ready', maintenance);
    const replay = services.maintenance.getAuditPack('mwp-mrov1-release-ready', maintenance);

    expect(pack.disclaimer).toContain('lingkungan demo dengan data fiktif');
    expect(pack.disclaimer).toContain('bukan Certificate of Release to Service');
    expect(pack.manifestHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(replay.manifestHash).toBe(pack.manifestHash);
    expect(pack.manifest).toMatchObject({
      workPackage: { number: 'MWP-MROV1-RTS' },
      aircraft: { registration: 'PK-MRA' }
    });

    expect(() =>
      sqlite
        .prepare("UPDATE maintenance_audit_packs SET manifest_hash = 'tampered' WHERE id = ?")
        .run(pack.id)
    ).toThrow(/immutable/u);

    sqlite.close();
  });

  it('exposes a technical record package with source, evidence, and release snapshot context', async () => {
    const { services, sqlite } = await createSeededTestServices();
    seedMroFoundationData(sqlite);
    seedMroV21Foundation(sqlite, context);

    const record = services.maintenance.getTechnicalRecordPackage('mwp-mrov1-release-ready');

    expect(record).toMatchObject({
      workPackageId: 'mwp-mrov1-release-ready',
      currentWorkPackage: expect.objectContaining({ packageNumber: 'MWP-MROV1-RTS' }),
      releaseEligibility: expect.objectContaining({ eligible: true }),
      evidence: expect.objectContaining({
        jobCards: expect.any(Array),
        materialTraceability: expect.any(Array),
        personnelEvidence: expect.any(Array),
        toolEvidence: expect.any(Array),
        approvedDataReferences: expect.any(Array)
      })
    });
    expect(record.evidence.jobCards.length).toBeGreaterThan(0);
    expect(record.evidence.approvedDataReferences.length).toBeGreaterThan(0);

    sqlite.close();
  });

  it('keeps release eligibility phase-aware after execution resources move to historical states', async () => {
    const { services, sqlite } = await createSeededTestServices();
    seedMroFoundationData(sqlite);
    seedMroV21Foundation(sqlite, context);

    sqlite
      .prepare(
        `UPDATE maintenance_tool_allocations_v2
         SET status = 'RETURNED', returned_at = ?
         WHERE work_package_id = ?`
      )
      .run(context.at(0, '11:00'), 'mwp-mrov1-release-ready');
    sqlite
      .prepare(
        `UPDATE maintenance_personnel_assignments
         SET status = 'RELEASED', released_at = ?
         WHERE work_package_id = ?`
      )
      .run(context.at(0, '11:05'), 'mwp-mrov1-release-ready');
    sqlite
      .prepare(
        `UPDATE inventory_stock_balances
         SET on_hand_quantity = 0
         WHERE part_id IN (
           SELECT part_id
           FROM maintenance_work_package_material_requirements
           WHERE work_package_id = ?
         )`
      )
      .run('mwp-mrov1-release-ready');
    sqlite
      .prepare(
        `UPDATE maintenance_slots
         SET status = 'COMPLETED'
         WHERE work_package_id = ?`
      )
      .run('mwp-mrov1-release-ready');

    const eligibility = services.maintenance.evaluateReleaseEligibility('mwp-mrov1-release-ready');
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.blockers.map((item) => item.code)).not.toEqual(
      expect.arrayContaining(['TOOL_NOT_ALLOCATED', 'PERSONNEL_REQUIREMENT_UNFULFILLED'])
    );
    expect(eligibility.blockers.map((item) => item.category)).not.toContain('TOOLING');

    sqlite.close();
  });
});
