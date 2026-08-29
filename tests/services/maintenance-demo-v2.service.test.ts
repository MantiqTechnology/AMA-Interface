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

  it('returns demo-grade work instruction metadata and approved-data links on job cards', async () => {
    const { services, sqlite } = await createSeededTestServices();
    seedMroFoundationData(sqlite);

    const workPackage = services.maintenance.getWorkPackage('mwp-mrov1-release-ready');
    const jobCard = workPackage.jobCards.find((card) => card.id === 'mjc-mrov1-release-001');

    expect(jobCard).toMatchObject({
      ataChapter: '24-30-00',
      aircraftArea: 'LH engine bay',
      systemName: 'Electrical power',
      componentName: 'Starter-generator indication wiring',
      componentPosition: 'Generator control circuit',
      accessPanel: 'ENG-LH-01',
      estimatedManHours: 2,
      skillRequirement: 'AME electrical authorization with C208B scope',
      releaseImpact: 'BLOCKS_RELEASE'
    });
    expect(jobCard?.workSteps).toEqual(
      expect.arrayContaining([
        'Inspect starter-generator indication wiring and terminals.',
        'Carry out operational check and record the result.'
      ])
    );
    expect(jobCard?.acceptanceCriteria).toContain(
      'Starter-generator indication remains stable during operational check.'
    );
    expect(jobCard?.requiredEvidence).toContain('Independent inspection record.');
    expect(jobCard?.safetyCautions).toContain(
      'Do not energize the electrical system while terminals are exposed.'
    );
    expect(jobCard?.prerequisites).toContain('Aircraft grounded for maintenance.');
    expect(jobCard?.approvedDataLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          approvedDataRevisionId: 'mdata-rev-amm-c208-active',
          documentType: 'AMM',
          documentNumber: 'AMA-MROV2-AMM-001',
          revisionStatus: 'ACTIVE',
          demoFileLabel: 'AMM reference extract',
          demoFileUrl: '/mro/reference/amm-c208b-rev-a.txt',
          demoPageRef: '24-30-00 p. 4-7'
        })
      ])
    );

    sqlite.close();
  });

  it('stores new work-instruction fields when adding a job card and keeps safe defaults', async () => {
    const { services, sqlite } = await createSeededTestServices();
    seedMroFoundationData(sqlite);

    const packageBefore = services.maintenance.getWorkPackage('mwp-mrov1-active');
    let updated = services.maintenance.addJobCard(
      packageBefore.id,
      {
        title: 'Demo borescope access inspection',
        taskType: 'SCHEDULED_TASK',
        maintenanceDataRef: 'AMM C208B 72-00-00',
        maintenanceDataRevision: 'REV-MROV2-ACTIVE',
        approvedDataRevisionId: 'mdata-rev-amm-c208-active',
        ataChapter: '72-00-00',
        aircraftArea: 'Engine bay',
        systemName: 'Powerplant',
        componentName: 'Borescope access port',
        componentPosition: 'RH compressor case',
        accessPanel: 'ENG-RH-04',
        estimatedManHours: 0.75,
        skillRequirement: 'AME powerplant authorization',
        releaseImpact: 'NO_RELEASE_IMPACT',
        workSteps: ['Open access panel.', 'Inspect access port condition.'],
        acceptanceCriteria: ['No leakage or loose fastener found.'],
        requiredEvidence: ['Access port condition photo.'],
        safetyCautions: ['Allow engine section to cool before access.'],
        prerequisites: ['Aircraft in maintenance custody.'],
        dependencyJobCardIds: ['MWP-MROV1-ACTIVE-JC-001'],
        mandatoryFlag: false,
        requiresIndependentInspection: false,
        expectedWorkPackageVersion: packageBefore.version
      },
      maintenance
    );
    const customCard = updated.jobCards.find(
      (card) => card.title === 'Demo borescope access inspection'
    );
    expect(customCard).toMatchObject({
      ataChapter: '72-00-00',
      aircraftArea: 'Engine bay',
      releaseImpact: 'NO_RELEASE_IMPACT',
      estimatedManHours: 0.75,
      dependencyJobCardIds: ['MWP-MROV1-ACTIVE-JC-001']
    });
    expect(customCard?.approvedDataLinks[0]).toMatchObject({
      approvedDataRevisionId: 'mdata-rev-amm-c208-active',
      demoFileUrl: '/mro/reference/amm-c208b-rev-a.txt'
    });

    updated = services.maintenance.addJobCard(
      updated.id,
      {
        title: 'Optional advisory default card',
        taskType: 'SCHEDULED_TASK',
        maintenanceDataRef: 'AMM C208B DEMO',
        maintenanceDataRevision: 'REV-MROV2-ACTIVE',
        mandatoryFlag: false,
        requiresIndependentInspection: false,
        expectedWorkPackageVersion: updated.version
      },
      maintenance
    );
    const defaultCard = updated.jobCards.find(
      (card) => card.title === 'Optional advisory default card'
    );
    expect(defaultCard).toMatchObject({
      estimatedManHours: 0,
      releaseImpact: 'ADVISORY',
      workSteps: [],
      acceptanceCriteria: [],
      requiredEvidence: [],
      safetyCautions: [],
      prerequisites: [],
      dependencyJobCardIds: [],
      approvedDataLinks: []
    });

    sqlite.close();
  });

  it('backfills upgraded instruction metadata when foundation seed already exists', async () => {
    const { services, sqlite } = await createSeededTestServices();
    seedMroFoundationData(sqlite);
    sqlite
      .prepare(
        `UPDATE maintenance_job_cards
         SET ata_chapter = NULL,
             aircraft_area = NULL,
             work_steps_json = '[]',
             acceptance_criteria_json = '[]',
             required_evidence_json = '[]'
         WHERE id = 'mjc-mrov1-release-001'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE maintenance_approved_data_revisions
         SET demo_file_label = NULL, demo_file_url = NULL, demo_page_ref = NULL
         WHERE id = 'mdata-rev-amm-c208-active'`
      )
      .run();

    seedMroFoundationData(sqlite);

    const jobCard = services.maintenance
      .getWorkPackage('mwp-mrov1-release-ready')
      .jobCards.find((card) => card.id === 'mjc-mrov1-release-001');
    expect(jobCard).toMatchObject({
      ataChapter: '24-30-00',
      aircraftArea: 'LH engine bay'
    });
    expect(jobCard?.workSteps).toContain(
      'Inspect starter-generator indication wiring and terminals.'
    );
    expect(jobCard?.approvedDataLinks[0]).toMatchObject({
      demoFileLabel: 'AMM reference extract',
      demoFileUrl: '/mro/reference/amm-c208b-rev-a.txt',
      demoPageRef: '24-30-00 p. 4-7'
    });

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
      decisionSummary: expect.objectContaining({
        status: 'READY_FOR_REVIEW',
        canIssueRelease: true
      }),
      documentIntegrity: expect.objectContaining({
        status: expect.stringMatching(/VERIFIED|PENDING_SNAPSHOT/),
        shortHash: expect.any(String)
      }),
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
    expect(record.releaseGates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'MANDATORY_JOB_CARD', status: 'COMPLETE' }),
        expect.objectContaining({ key: 'APPROVED_MAINTENANCE_DATA', status: 'COMPLETE' })
      ])
    );
    expect(record.completenessCards.length).toBe(5);

    const blocked = services.maintenance.getTechnicalRecordPackage('mwp-mrov21-conflict');
    expect(blocked.decisionSummary).toMatchObject({
      status: 'BLOCKED',
      canIssueRelease: false
    });
    expect(blocked.releaseGates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'MANDATORY_JOB_CARD', status: 'BLOCKED' }),
        expect.objectContaining({ key: 'SOURCE_DEFECT_REVIEW', status: 'WARNING' }),
        expect.objectContaining({ key: 'FACILITY_SLOT', status: 'WARNING' })
      ])
    );
    expect(blocked.nextRequiredActions.length).toBeGreaterThan(0);

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
