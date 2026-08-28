import { describe, expect, it } from 'vitest';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { seedMroFoundationData } from '../../server/db/seeds/mro-foundation';
import { seedMroV21Foundation } from '../../server/db/seeds/mro-v21-foundation';
import type { MaintenanceWorkPackageDto } from '../../shared/features/maintenance';
import { createSeededTestServices } from '../helpers/demo-db';

const context = createDemoSeedContext();
const manager = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager',
  requestId: 'test-m4-manager'
};
const technician = {
  userId: 'USR-MAINTENANCE-TECHNICIAN',
  role: 'Maintenance Technician',
  requestId: 'test-m4-technician'
};
const certifier = {
  userId: 'USR-CERTIFYING-STAFF',
  role: 'Certifying Staff',
  requestId: 'test-m4-certifier'
};
const reporter = {
  userId: 'USR-001',
  role: 'OCC',
  requestId: 'test-m4-reporter'
};

async function createFixture() {
  const fixture = await createSeededTestServices();
  seedMroFoundationData(fixture.sqlite, context);
  seedMroV21Foundation(fixture.sqlite, context);
  return fixture;
}

function findNewestCard(workPackage: MaintenanceWorkPackageDto, title: string) {
  const card = [...workPackage.jobCards].reverse().find((item) => item.title === title);
  if (!card) throw new Error(`Job card not found: ${title}`);
  return card;
}

function createActiveSourceJobCard(
  services: Awaited<ReturnType<typeof createSeededTestServices>>['services'],
  title = 'M4 source inspection job card'
) {
  let workPackage = services.maintenance.getWorkPackage('mwp-mrov1-active');
  workPackage = services.maintenance.addJobCard(
    workPackage.id,
    {
      title,
      taskType: 'INSPECTION',
      maintenanceDataRef: 'AMM DEMO 05-20-00',
      maintenanceDataRevision: 'REV-M4-2026-08',
      mandatoryFlag: false,
      requiresIndependentInspection: false,
      expectedWorkPackageVersion: workPackage.version
    },
    manager
  );
  const source = findNewestCard(workPackage, title);
  workPackage = services.maintenance.startJobCard(
    source.id,
    { expectedVersion: source.version },
    technician
  );
  return {
    workPackage,
    source: workPackage.jobCards.find((item) => item.id === source.id)!
  };
}

function createOpenFinding(
  services: Awaited<ReturnType<typeof createSeededTestServices>>['services'],
  title = 'Hydraulic hose chafing at LH main landing gear'
) {
  const { source } = createActiveSourceJobCard(services);
  const workPackage = services.maintenance.createNonRoutineFinding(
    'mwp-mrov1-active',
    {
      sourceJobCardId: source.id,
      title,
      description:
        'Mechanic found unexpected hydraulic hose chafing while executing planned inspection.',
      severity: 'HIGH',
      location: 'LH main landing gear',
      ataChapter: '29',
      detectedDuring: 'INSPECTION',
      operationalImpact: 'GROUNDING_AOG',
      findingClassification: 'SAFETY_CRITICAL',
      melCdlAssessment: 'CANDIDATE',
      immediateAction: 'Stop aircraft movement and notify Maintenance Control.',
      aircraftMovementProhibited: true,
      notifyMaintenanceControl: true,
      requiresInspectorReview: true,
      immediateSafetyConcern: true,
      evidenceReferences: ['M4-NR-EVIDENCE-001'],
      idempotencyKey: `m4-create-${title}`
    },
    technician
  );
  return {
    workPackage,
    finding: workPackage.nonRoutineFindings!.find((item) => item.title === title)!
  };
}

function assessAndCreateCorrective(
  services: Awaited<ReturnType<typeof createSeededTestServices>>['services'],
  findingId: string,
  requiresIndependentInspection = true
) {
  let workPackage = services.maintenance.assessNonRoutineFinding(
    findingId,
    {
      disposition: 'CORRECTIVE_WORK_REQUIRED',
      assessmentNote:
        'Maintenance Control requires corrective work before the Work Package can continue.',
      priority: 'HIGH',
      requiresIndependentInspection,
      approvedDataRef: 'AMM DEMO 29-10-00'
    },
    manager
  );
  const finding = workPackage.nonRoutineFindings!.find((item) => item.id === findingId)!;
  workPackage = services.maintenance.createCorrectiveJobCardForFinding(
    finding.id,
    {
      title: `Corrective work for ${finding.findingNumber}`,
      maintenanceDataRef: 'AMM DEMO 29-10-00',
      maintenanceDataRevision: 'REV-M4-2026-08',
      mandatoryFlag: true,
      requiresIndependentInspection,
      expectedWorkPackageVersion: workPackage.version
    },
    manager
  );
  const refreshedFinding = workPackage.nonRoutineFindings!.find((item) => item.id === findingId)!;
  const corrective = workPackage.jobCards.find(
    (item) => item.id === refreshedFinding.correctiveJobCardId
  )!;
  return { workPackage, finding: refreshedFinding, corrective };
}

function signAndInspectCorrective(
  services: Awaited<ReturnType<typeof createSeededTestServices>>['services'],
  correctiveJobCardId: string,
  pass = true
) {
  let workPackage = services.maintenance.getWorkPackage('mwp-mrov1-active');
  let corrective = workPackage.jobCards.find((item) => item.id === correctiveJobCardId)!;
  workPackage = services.maintenance.startJobCard(
    corrective.id,
    { expectedVersion: corrective.version },
    technician
  );
  corrective = workPackage.jobCards.find((item) => item.id === correctiveJobCardId)!;
  workPackage = services.maintenance.signWork(
    corrective.id,
    {
      expectedVersion: corrective.version,
      certifyingLicenseNumber: 'AME-TECH-MRO-001',
      statement: 'Corrective non-routine work completed with required evidence.',
      evidenceReferences: ['M4-CORRECTIVE-SIGNOFF-EVIDENCE']
    },
    technician
  );
  corrective = workPackage.jobCards.find((item) => item.id === correctiveJobCardId)!;
  if (corrective.requiresIndependentInspection) {
    workPackage = services.maintenance.inspectJobCard(
      corrective.id,
      {
        expectedVersion: corrective.version,
        decision: pass ? 'PASSED' : 'FAILED',
        statement: pass
          ? 'Independent inspection passed for non-routine corrective work.'
          : 'Independent inspection failed and requires rework.',
        certifyingLicenseNumber: 'AME-CERT-MRO-001',
        inspectedAt: context.at(0, '12:00'),
        idempotencyKey: `m4-inspect-${corrective.id}-${pass ? 'pass' : 'fail'}`,
        evidenceReferences: ['M4-CORRECTIVE-INSPECTION-EVIDENCE']
      },
      certifier
    );
  }
  return workPackage;
}

describe('M4 non-routine finding lifecycle', () => {
  it('creates non-routine findings from active job cards with auth, source context, and idempotency', async () => {
    const { services, sqlite } = await createFixture();
    const { source } = createActiveSourceJobCard(services);

    expect(() =>
      services.maintenance.createNonRoutineFinding(
        'mwp-mrov1-active',
        {
          sourceJobCardId: source.id,
          title: 'Unauthorized NR attempt',
          description: 'OCC user attempts to create maintenance execution finding.',
          severity: 'NORMAL',
          immediateSafetyConcern: false,
          evidenceReferences: ['M4-UNAUTHORIZED'],
          idempotencyKey: 'm4-unauthorized-create'
        },
        reporter
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_PERMISSION_REQUIRED' }));

    const created = services.maintenance.createNonRoutineFinding(
      'mwp-mrov1-active',
      {
        sourceJobCardId: source.id,
        title: 'Hydraulic hose chafing',
        description: 'Unexpected hydraulic hose chafing found during planned maintenance.',
        severity: 'HIGH',
        location: 'LH main landing gear',
        ataChapter: '29',
        detectedDuring: 'INSPECTION',
        operationalImpact: 'GROUNDING_AOG',
        findingClassification: 'SAFETY_CRITICAL',
        melCdlAssessment: 'CANDIDATE',
        immediateAction: 'Stop aircraft movement and notify Maintenance Control.',
        aircraftMovementProhibited: true,
        notifyMaintenanceControl: true,
        requiresInspectorReview: true,
        immediateSafetyConcern: true,
        evidenceReferences: ['M4-HOSE-EVIDENCE'],
        idempotencyKey: 'm4-create-hose'
      },
      technician
    );
    const replay = services.maintenance.createNonRoutineFinding(
      'mwp-mrov1-active',
      {
        sourceJobCardId: source.id,
        title: 'Hydraulic hose chafing',
        description: 'Unexpected hydraulic hose chafing found during planned maintenance.',
        severity: 'HIGH',
        immediateSafetyConcern: true,
        evidenceReferences: ['M4-HOSE-EVIDENCE'],
        idempotencyKey: 'm4-create-hose'
      },
      technician
    );

    expect(created.nonRoutineFindings).toHaveLength(1);
    expect(replay.nonRoutineFindings).toHaveLength(1);
    expect(created.nonRoutineFindings![0]).toMatchObject({
      sourceJobCardId: source.id,
      aircraftId: created.aircraftId,
      workflowState: 'WAITING_ASSESSMENT',
      foundByUserId: technician.userId,
      detectedDuring: 'INSPECTION',
      operationalImpact: 'GROUNDING_AOG',
      findingClassification: 'SAFETY_CRITICAL',
      melCdlAssessment: 'CANDIDATE',
      immediateAction: 'Stop aircraft movement and notify Maintenance Control.',
      aircraftMovementProhibited: true,
      notifyMaintenanceControl: true,
      requiresInspectorReview: true
    });
    expect(services.maintenance.evaluateReleaseEligibility('mwp-mrov1-active').blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'NON_ROUTINE_FINDING_OPEN' })])
    );
    expect(() =>
      services.maintenance.assessNonRoutineFinding(
        created.nonRoutineFindings![0]!.id,
        {
          disposition: 'CORRECTIVE_WORK_REQUIRED',
          assessmentNote: 'Technician must not assess own non-routine finding.',
          priority: 'HIGH',
          requiresIndependentInspection: true
        },
        technician
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_PERMISSION_REQUIRED' }));
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM maintenance_non_routine_findings
           WHERE create_idempotency_key = 'm4-create-hose'`
        )
        .get()
    ).toMatchObject({ count: 1 });

    sqlite.close();
  });

  it('drives corrective work, failed inspection rework, resolution, closure, and release blocker clearing', async () => {
    const { services, sqlite } = await createFixture();
    const { finding } = createOpenFinding(services);
    expect(services.maintenance.evaluateReleaseEligibility('mwp-mrov1-active').blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'NON_ROUTINE_FINDING_OPEN' })])
    );

    expect(() =>
      services.maintenance.closeNonRoutineFinding(
        finding.id,
        {
          closureNote: 'Attempt to close before corrective work is resolved.',
          evidenceReferences: ['M4-CLOSE-EARLY']
        },
        manager
      )
    ).toThrowError(expect.objectContaining({ code: 'NON_ROUTINE_NOT_RESOLVED' }));

    const { corrective } = assessAndCreateCorrective(services, finding.id, true);
    expect(() =>
      services.maintenance.createCorrectiveJobCardForFinding(
        finding.id,
        {
          title: 'Duplicate corrective work',
          maintenanceDataRef: 'AMM DEMO 29-10-00',
          maintenanceDataRevision: 'REV-M4-2026-08',
          mandatoryFlag: true,
          requiresIndependentInspection: true,
          expectedWorkPackageVersion:
            services.maintenance.getWorkPackage('mwp-mrov1-active').version
        },
        manager
      )
    ).toThrowError(expect.objectContaining({ code: 'CORRECTIVE_WORK_ALREADY_EXISTS' }));

    let workPackage = signAndInspectCorrective(services, corrective.id, false);
    let updatedCorrective = workPackage.jobCards.find((item) => item.id === corrective.id)!;
    expect(updatedCorrective.status).toBe('REJECTED_FOR_REWORK');
    expect(() =>
      services.maintenance.resolveNonRoutineFinding(
        finding.id,
        {
          resolutionNote: 'Attempt before rework is complete.',
          evidenceReferences: ['M4-RESOLVE-EARLY']
        },
        manager
      )
    ).toThrowError(expect.objectContaining({ code: 'NON_ROUTINE_NOT_RESOLVED' }));

    const rework = updatedCorrective.reworkActions[0]!;
    workPackage = services.maintenance.signReworkAction(
      rework.id,
      {
        expectedVersion: workPackage.version,
        certifyingLicenseNumber: 'AME-TECH-MRO-001',
        correctiveActionDescription:
          'Hydraulic hose routing was corrected after failed inspection.',
        approvedDataRef: 'AMM DEMO 29-10-00',
        statement: 'Rework completed for failed non-routine corrective inspection.',
        evidenceReferences: ['M4-NR-REWORK-EVIDENCE']
      },
      technician
    );
    updatedCorrective = workPackage.jobCards.find((item) => item.id === corrective.id)!;
    workPackage = services.maintenance.inspectJobCard(
      corrective.id,
      {
        expectedVersion: updatedCorrective.version,
        decision: 'PASSED',
        statement: 'Reinspection passed after non-routine corrective rework.',
        certifyingLicenseNumber: 'AME-CERT-MRO-001',
        inspectedAt: context.at(0, '14:00'),
        idempotencyKey: 'm4-reinspection-pass',
        evidenceReferences: ['M4-NR-REINSPECTION-EVIDENCE']
      },
      certifier
    );
    updatedCorrective = workPackage.jobCards.find((item) => item.id === corrective.id)!;
    expect(updatedCorrective.status).toBe('READY_FOR_RELEASE_REVIEW');

    workPackage = services.maintenance.resolveNonRoutineFinding(
      finding.id,
      {
        resolutionNote: 'Corrective work, rework, and reinspection evidence reviewed.',
        evidenceReferences: ['M4-NR-RESOLUTION-EVIDENCE']
      },
      manager
    );
    expect(workPackage.nonRoutineFindings![0]!.workflowState).toBe('RESOLVED');
    workPackage = services.maintenance.closeNonRoutineFinding(
      finding.id,
      {
        closureNote: 'Non-routine finding closed after controlled corrective resolution.',
        evidenceReferences: ['M4-NR-CLOSURE-EVIDENCE']
      },
      manager
    );
    expect(workPackage.nonRoutineFindings![0]).toMatchObject({
      status: 'CLOSED',
      workflowState: 'CLOSED'
    });
    expect(
      services.maintenance.evaluateReleaseEligibility('mwp-mrov1-active').blockers
    ).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'NON_ROUTINE_FINDING_OPEN' })])
    );
    expect(
      sqlite
        .prepare(
          `SELECT action
           FROM maintenance_audit_logs
           WHERE entity_type = 'NON_ROUTINE_FINDING' AND entity_id = ?
           ORDER BY occurred_at`
        )
        .all(finding.id)
        .map((row) => String((row as { action: string }).action))
    ).toEqual(
      expect.arrayContaining([
        'NR_CREATED',
        'NR_ASSESSED',
        'CORRECTIVE_JOB_CARD_CREATED',
        'NR_RESOLVED',
        'NR_CLOSED'
      ])
    );

    sqlite.close();
  });

  it('reuses M2 material lifecycle for corrective non-routine work before resolution', async () => {
    const { services, sqlite } = await createFixture();
    const { finding } = createOpenFinding(services, 'Corrective material required');
    const { corrective } = assessAndCreateCorrective(services, finding.id, false);
    const requirement = services.resourceV21.createMaterialRequirement(
      {
        workPackageId: 'mwp-mrov1-active',
        jobCardId: corrective.id,
        partId: 'inv-part-brake-pc6',
        requiredQuantity: 1,
        unit: 'EA',
        requestedStationId: 'st-djj',
        reason: 'M4 non-routine corrective material requirement'
      },
      manager
    );
    let workPackage = services.maintenance.startJobCard(
      corrective.id,
      { expectedVersion: corrective.version },
      technician
    );
    let updatedCorrective = workPackage.jobCards.find((item) => item.id === corrective.id)!;
    workPackage = services.maintenance.signWork(
      corrective.id,
      {
        expectedVersion: updatedCorrective.version,
        certifyingLicenseNumber: 'AME-TECH-MRO-001',
        statement: 'Corrective non-routine work completed before material traceability review.',
        evidenceReferences: ['M4-MATERIAL-CORRECTIVE-SIGNOFF']
      },
      technician
    );
    updatedCorrective = workPackage.jobCards.find((item) => item.id === corrective.id)!;
    expect(updatedCorrective.status).toBe('READY_FOR_RELEASE_REVIEW');
    expect(() =>
      services.maintenance.resolveNonRoutineFinding(
        finding.id,
        {
          resolutionNote: 'Attempt before corrective material lifecycle is complete.',
          evidenceReferences: ['M4-MATERIAL-INCOMPLETE']
        },
        manager
      )
    ).toThrowError(expect.objectContaining({ code: 'NON_ROUTINE_MATERIAL_INCOMPLETE' }));

    const reservation = services.resourceV21.reserveMaterial(
      {
        materialRequirementId: requirement.id,
        inventoryItemId: 'inv-bal-brake-djj',
        serializedPartId: 'inv-serial-brake-001',
        quantity: 1,
        unit: 'EA',
        stationId: 'st-djj',
        inventoryLocationId: 'inv-bin-djj-usable',
        idempotencyKey: 'm4-material-reserve'
      },
      manager,
      'mwp-mrov1-active'
    );
    services.resourceV21.issueMaterial(
      { reservationId: reservation.id, quantity: 1, idempotencyKey: 'm4-material-issue' },
      manager,
      'mwp-mrov1-active'
    );
    services.resourceV21.installMaterial(
      {
        reservationId: reservation.id,
        quantity: 1,
        jobCardId: corrective.id,
        position: 'LH MAIN LANDING GEAR HYDRAULIC BAY',
        idempotencyKey: 'm4-material-install'
      },
      technician,
      'mwp-mrov1-active'
    );
    const resolved = services.maintenance.resolveNonRoutineFinding(
      finding.id,
      {
        resolutionNote: 'Corrective material installed and Job Card completed.',
        evidenceReferences: ['M4-MATERIAL-RESOLUTION']
      },
      manager
    );
    expect(resolved.nonRoutineFindings![0]!.workflowState).toBe('RESOLVED');
    const trace = services.resourceV21.listMaterialTraceability(
      'mwp-mrov1-active',
      requirement.id
    )[0]!;
    expect(trace).toMatchObject({
      materialRequirementId: requirement.id,
      traceComplete: true
    });
    expect(trace.installations[0]).toMatchObject({
      jobCardId: corrective.id,
      status: 'INSTALLED'
    });

    sqlite.close();
  });
});
