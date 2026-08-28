import { describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { createSeededTestServices } from '../helpers/demo-db';

const context = createDemoSeedContext();
const occ = { userId: 'USR-001', role: 'OCC' };
const maintenance = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager',
  requestId: 'test-maintenance-manager'
};
const certifier = {
  userId: 'USR-CERTIFYING-STAFF',
  role: 'Certifying Staff',
  requestId: 'test-certifying-staff'
};
const finance = {
  userId: 'USR-FINANCE-REVIEWER',
  role: 'Finance Reviewer',
  requestId: 'test-finance-reviewer'
};

function seedAuthorizationLite(
  sqlite: Database.Database,
  options: {
    id: string;
    authorizationNumber: string;
    personnelId: string;
    actorUserId: string;
    licenseNumber: string;
    permittedActions: string[];
    status?: 'ACTIVE' | 'INACTIVE';
    validFrom?: string;
    validUntil?: string;
    aircraftTypeScope?: string[];
    aircraftRegistrationScope?: string[];
  }
) {
  const license = sqlite
    .prepare('SELECT id FROM personnel_licenses WHERE personnel_id = ? AND license_number = ?')
    .get(options.personnelId, options.licenseNumber) as { id: string } | undefined;
  if (!license) throw new Error(`Missing licence ${options.licenseNumber}`);
  const timestamp = context.at(0, '07:00');
  sqlite
    .prepare(
      `INSERT OR REPLACE INTO maintenance_company_authorizations (
        id, authorization_number, personnel_id, actor_user_id, license_id, license_number,
        status, valid_from, valid_until, permitted_actions_json, aircraft_type_scope_json,
        aircraft_registration_scope_json, notes, issued_by, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Test authorization lite record.',
        'PT AMA Test Seed', 1, ?, ?)`
    )
    .run(
      options.id,
      options.authorizationNumber,
      options.personnelId,
      options.actorUserId,
      license.id,
      options.licenseNumber,
      options.status ?? 'ACTIVE',
      options.validFrom ?? context.date(-30),
      options.validUntil ?? context.date(120),
      JSON.stringify(options.permittedActions),
      JSON.stringify(
        options.aircraftTypeScope ?? ['Cessna Caravan 208B', 'Pilatus PC-6', 'PAC 750XL']
      ),
      JSON.stringify(options.aircraftRegistrationScope ?? []),
      timestamp,
      timestamp
    );
}

function seedCertifyingPersonnel(
  sqlite: Database.Database,
  options: {
    actorUserId?: string;
    personnelId?: string;
    licenseNumber?: string;
    licenseStatus?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | 'SUPERSEDED';
    issueDate?: string | null;
    expiryDate?: string | null;
    qualificationReferenceId?: string | null;
    qualificationStatus?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED';
    qualificationExpiresAt?: string | null;
  } = {}
) {
  const actorUserId = options.actorUserId ?? certifier.userId;
  const existingPersonnel = sqlite
    .prepare('SELECT id FROM crews WHERE employee_code = ? LIMIT 1')
    .get(actorUserId) as { id: string } | undefined;
  const personnelId =
    options.personnelId ??
    existingPersonnel?.id ??
    `crew-${actorUserId.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-')}`;
  const licenseNumber = options.licenseNumber ?? 'AME-CERT-MRO-001';
  const timestamp = context.at(0, '07:00');
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO crews (
        id, employee_code, full_name, crew_role, license_type, license_number,
        license_expiry_date, medical_expiry_date, availability_status, unit,
        employment_status, lifecycle_status, version, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, 'GROUND_CREW', 'AMEL', ?, ?, NULL, 'AVAILABLE', 'Maintenance',
        'PERMANENT', 'ACTIVE', 1, 1, ?, ?)`
    )
    .run(
      personnelId,
      actorUserId,
      actorUserId === certifier.userId ? 'Demo Certifying Staff' : 'Alternate Certifying Staff',
      licenseNumber,
      options.expiryDate ?? context.date(60),
      timestamp,
      timestamp
    );
  sqlite
    .prepare(
      `UPDATE crews
       SET employee_code = ?, full_name = ?, license_type = 'AMEL', license_number = ?,
           license_expiry_date = ?, availability_status = 'AVAILABLE', unit = 'Maintenance',
           employment_status = 'PERMANENT', lifecycle_status = 'ACTIVE',
           version = 1, is_active = 1, updated_at = ?
       WHERE id = ?`
    )
    .run(
      actorUserId,
      actorUserId === certifier.userId ? 'MRO Certifying Staff' : 'Alternate Certifying Staff',
      licenseNumber,
      options.expiryDate ?? context.date(60),
      timestamp,
      personnelId
    );
  sqlite
    .prepare(
      `INSERT OR REPLACE INTO personnel_licenses (
        id, personnel_id, license_type, license_number, issuing_authority,
        issue_date, expiry_date, is_primary, status, document_id, created_at, updated_at
      ) VALUES (?, ?, 'AMEL', ?, 'TEST_AUTHORITY', ?, ?, 1, ?, 'doc-certifying-licence', ?, ?)`
    )
    .run(
      `plic-${personnelId}`,
      personnelId,
      licenseNumber,
      options.issueDate ?? context.date(-365),
      options.expiryDate ?? context.date(60),
      options.licenseStatus ?? 'ACTIVE',
      timestamp,
      timestamp
    );
  if (options.qualificationReferenceId !== undefined) {
    sqlite
      .prepare(
        `DELETE FROM personnel_qualifications
         WHERE personnel_id = ? AND qualification_type = 'AIRCRAFT_TYPE'`
      )
      .run(personnelId);
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO personnel_qualifications (
          id, personnel_id, qualification_type, reference_type, reference_id,
          issued_at, expires_at, status, notes, document_id, created_at, updated_at
	        ) VALUES (?, ?, 'AIRCRAFT_TYPE', 'AIRCRAFT_TYPE', ?, ?, ?, ?,
	          'Aircraft/type scope', 'doc-type-scope', ?, ?)`
      )
      .run(
        `pqual-${personnelId}`,
        personnelId,
        options.qualificationReferenceId,
        context.date(-365),
        options.qualificationExpiresAt ?? context.date(60),
        options.qualificationStatus ?? 'VALID',
        timestamp,
        timestamp
      );
  }
  seedAuthorizationLite(sqlite, {
    id: `mca-${personnelId}-inspection`,
    authorizationNumber: `PTAMA-MRO-AUTH-INSP-${personnelId}`,
    personnelId,
    actorUserId,
    licenseNumber,
    permittedActions: ['INDEPENDENT_INSPECTION', 'INDEPENDENT_REINSPECTION']
  });
  seedAuthorizationLite(sqlite, {
    id: `mca-${personnelId}-release`,
    authorizationNumber:
      actorUserId === certifier.userId
        ? 'PTAMA-MRO-AUTH-REL-001'
        : `PTAMA-MRO-AUTH-REL-${personnelId}`,
    personnelId,
    actorUserId,
    licenseNumber,
    permittedActions: ['TECHNICAL_RELEASE']
  });
  return { personnelId, licenseNumber };
}

function seedMaintenanceManagerAuthorization(
  sqlite: Database.Database,
  options: {
    withAuthorization?: boolean;
    authorizationStatus?: 'ACTIVE' | 'INACTIVE';
    permittedActions?: string[];
    aircraftTypeScope?: string[];
    aircraftRegistrationScope?: string[];
    validUntil?: string;
  } = {}
) {
  const timestamp = context.at(0, '07:00');
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO crews (
        id, employee_code, full_name, crew_role, license_type, license_number,
        license_expiry_date, medical_expiry_date, availability_status, unit,
        employment_status, lifecycle_status, version, is_active, created_at, updated_at
      ) VALUES ('crew-maintenance-manager', ?, 'MRO Maintenance Manager', 'GROUND_CREW',
        'AMEL', 'AME-MECH-MRO-001', ?, NULL, 'AVAILABLE', 'Maintenance',
        'PERMANENT', 'ACTIVE', 1, 1, ?, ?)`
    )
    .run(maintenance.userId, context.date(120), timestamp, timestamp);
  sqlite
    .prepare(
      `INSERT OR REPLACE INTO personnel_licenses (
        id, personnel_id, license_type, license_number, issuing_authority,
        issue_date, expiry_date, is_primary, status, document_id, created_at, updated_at
      ) VALUES ('plic-crew-maintenance-manager', 'crew-maintenance-manager', 'AMEL',
        'AME-MECH-MRO-001', 'TEST_AUTHORITY', ?, ?, 1, 'ACTIVE', 'doc-mech-licence', ?, ?)`
    )
    .run(context.date(-365), context.date(120), timestamp, timestamp);
  for (const [suffix, referenceId] of [
    ['c208b', 'Cessna Caravan 208B'],
    ['pc6', 'Pilatus PC-6'],
    ['pac750xl', 'PAC 750XL']
  ] as const) {
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO personnel_qualifications (
          id, personnel_id, qualification_type, reference_type, reference_id,
          issued_at, expires_at, status, notes, document_id, created_at, updated_at
        ) VALUES (?, 'crew-maintenance-manager', 'AIRCRAFT_TYPE',
          'AIRCRAFT_TYPE', ?, ?, ?, 'VALID',
          'Aircraft/type scope', 'doc-mech-type-scope', ?, ?)`
      )
      .run(
        `pqual-crew-maintenance-manager-${suffix}`,
        referenceId,
        context.date(-365),
        context.date(120),
        timestamp,
        timestamp
      );
  }
  if (options.withAuthorization ?? true) {
    seedAuthorizationLite(sqlite, {
      id: 'mca-crew-maintenance-manager-mechanic',
      authorizationNumber: 'PTAMA-MRO-AUTH-MECH-001',
      personnelId: 'crew-maintenance-manager',
      actorUserId: maintenance.userId,
      licenseNumber: 'AME-MECH-MRO-001',
      status: options.authorizationStatus,
      validUntil: options.validUntil,
      permittedActions: options.permittedActions ?? ['MECHANIC_SIGN_OFF', 'REWORK_SIGN_OFF'],
      aircraftTypeScope: options.aircraftTypeScope,
      aircraftRegistrationScope: options.aircraftRegistrationScope
    });
  }
}

function seedControlledMaintenanceActors(sqlite: Database.Database) {
  seedMaintenanceManagerAuthorization(sqlite);
  seedCertifyingPersonnel(sqlite);
}

function latestRequirementId(
  sqlite: Database.Database,
  aircraftId: string,
  requirementCode: string
) {
  const row = sqlite
    .prepare(
      `SELECT id FROM aircraft_maintenance_requirements
       WHERE aircraft_id = ? AND requirement_code = ?`
    )
    .get(aircraftId, requirementCode) as { id: string } | undefined;
  if (!row) throw new Error(`Requirement ${requirementCode} was not created.`);
  return row.id;
}

type SeededTestServices = Awaited<ReturnType<typeof createSeededTestServices>>;

function createReadyWorkPackage(
  env: SeededTestServices,
  options: {
    aircraftId?: string;
    releaseIndex?: string;
    withDefect?: boolean;
    requiresInspection?: boolean;
    requirementId?: string;
    maintenanceDataRef?: string;
    maintenanceDataRevision?: string;
    seedActors?: boolean;
  } = {}
) {
  const { services } = env;
  if (options.seedActors ?? true) {
    seedControlledMaintenanceActors(env.sqlite);
  } else {
    seedMaintenanceManagerAuthorization(env.sqlite);
  }
  const aircraftId = options.aircraftId ?? 'ac-pk-ama';
  const releaseIndex = options.releaseIndex ?? '001';
  let defectId: string | undefined;
  if (options.withDefect ?? true) {
    const aircraftBefore = services.aircraftAirworthiness.detail(aircraftId).aircraft;
    const grounded = services.aircraftAirworthiness.reportDefect(
      aircraftId,
      {
        title: `MRO defect ${releaseIndex}`,
        description: `Pilot technical log defect ${releaseIndex} requires controlled MRO rectification.`,
        detectedAt: context.at(0, '09:20'),
        sourceReference: `TECHLOG-MRO-${releaseIndex}`,
        evidenceReferences: [`TECHLOG-MRO-${releaseIndex}`],
        expectedVersion: aircraftBefore.version
      },
      occ
    );
    defectId = grounded.defects[0]!.id;
    services.maintenance.assessDefect(
      defectId,
      {
        assessmentDecision: 'GROUND',
        assessmentNote: `Maintenance Control assessment confirms defect ${releaseIndex} requires controlled MRO planning.`
      },
      maintenance
    );
  }
  let workPackage = services.maintenance.createWorkPackage(
    {
      aircraftId,
      primaryDefectId: defectId,
      title: `Controlled MRO work package ${releaseIndex}`,
      priority: 'NORMAL',
      executionMode: 'INTERNAL'
    },
    maintenance
  );
  workPackage = services.maintenance.addJobCard(
    workPackage.id,
    {
      title: `Mandatory MRO job card ${releaseIndex}`,
      taskType: defectId ? 'DEFECT_RECTIFICATION' : 'SCHEDULED_TASK',
      maintenanceDataRef: options.maintenanceDataRef ?? `AMM DEMO ${releaseIndex}`,
      maintenanceDataRevision: options.maintenanceDataRevision ?? 'REV-DEMO-2026-08',
      mandatoryFlag: true,
      requiresIndependentInspection: options.requiresInspection ?? false,
      expectedWorkPackageVersion: workPackage.version
    },
    maintenance
  );
  let jobCard = workPackage.jobCards[0]!;
  if (options.requirementId) {
    workPackage = services.maintenance.linkRequirementToJobCard(
      workPackage.id,
      options.requirementId,
      jobCard.id,
      maintenance
    );
    jobCard = workPackage.jobCards[0]!;
  }
  workPackage = services.maintenance.startJobCard(
    jobCard.id,
    { expectedVersion: jobCard.version },
    maintenance
  );
  jobCard = workPackage.jobCards[0]!;
  workPackage = services.maintenance.signWork(
    jobCard.id,
    {
      expectedVersion: jobCard.version,
      certifyingLicenseNumber: 'AME-MECH-MRO-001',
      statement: `Mandatory MRO work ${releaseIndex} completed with evidence and approved data.`,
      evidenceReferences: [`JC-EVIDENCE-${releaseIndex}`]
    },
    maintenance
  );
  jobCard = workPackage.jobCards[0]!;
  if (options.requiresInspection) {
    workPackage = services.maintenance.inspectJobCard(
      jobCard.id,
      inspectionInput(releaseIndex, jobCard.version),
      certifier
    );
  }
  workPackage = services.maintenance.requestRelease(
    workPackage.id,
    { expectedVersion: workPackage.version },
    maintenance
  );
  return { workPackage, defectId, jobCardId: jobCard.id };
}

function releaseInput(
  releaseIndex: string,
  expectedVersion: number,
  overrides: Partial<{
    releaseNumber: string;
    certifyingLicenseNumber: string;
    releasedAt: string;
    idempotencyKey: string;
  }> = {}
) {
  return {
    expectedVersion,
    releaseNumber: overrides.releaseNumber ?? `RTS-MRO-${releaseIndex}`,
    resultingStatus: 'SERVICEABLE' as const,
    releaseStatement: `Aircraft is technically released after controlled MRO package ${releaseIndex} completion.`,
    certifyingLicenseNumber: overrides.certifyingLicenseNumber ?? 'AME-CERT-MRO-001',
    releasedAt: overrides.releasedAt ?? context.at(0, '08:50'),
    evidenceReferences: [`MWP-RELEASE-${releaseIndex}`],
    idempotencyKey: overrides.idempotencyKey
  };
}

function inspectionInput(
  inspectionIndex: string,
  expectedVersion: number,
  overrides: Partial<{
    decision: 'PASSED' | 'FAILED';
    statement: string;
    certifyingLicenseNumber: string;
    inspectedAt: string;
    idempotencyKey: string;
    evidenceReferences: string[];
  }> = {}
) {
  return {
    expectedVersion,
    decision: overrides.decision ?? 'PASSED',
    statement:
      overrides.statement ??
      `Independent inspection ${inspectionIndex} passed with immutable evidence.`,
    certifyingLicenseNumber: overrides.certifyingLicenseNumber ?? 'AME-CERT-MRO-001',
    inspectedAt: overrides.inspectedAt ?? context.at(0, '10:45'),
    idempotencyKey: overrides.idempotencyKey ?? `mro-inspection-${inspectionIndex}`,
    evidenceReferences: overrides.evidenceReferences ?? [`INSP-EVIDENCE-${inspectionIndex}`]
  };
}

function createStartedJobCard(env: SeededTestServices, releaseIndex: string) {
  const { services } = env;
  const workPackage = services.maintenance.createWorkPackage(
    {
      aircraftId: 'ac-pk-ama',
      title: `Authorization lite work package ${releaseIndex}`,
      priority: 'NORMAL',
      executionMode: 'INTERNAL'
    },
    maintenance
  );
  const withCard = services.maintenance.addJobCard(
    workPackage.id,
    {
      title: `Authorization lite job card ${releaseIndex}`,
      taskType: 'SCHEDULED_TASK',
      maintenanceDataRef: `AMM AUTH ${releaseIndex}`,
      maintenanceDataRevision: 'REV-AUTH-2026-08',
      mandatoryFlag: true,
      requiresIndependentInspection: false,
      expectedWorkPackageVersion: workPackage.version
    },
    maintenance
  );
  const card = withCard.jobCards[0]!;
  const started = services.maintenance.startJobCard(
    card.id,
    { expectedVersion: card.version },
    maintenance
  );
  return started.jobCards[0]!;
}

function releaseRequestHash(workPackageId: string, input: ReturnType<typeof releaseInput>) {
  const canonical = {
    workPackageId,
    releaseNumber: input.releaseNumber,
    resultingStatus: input.resultingStatus,
    releaseStatement: input.releaseStatement,
    certifyingLicenseNumber: input.certifyingLicenseNumber,
    releasedAt: input.releasedAt,
    evidenceReferences: input.evidenceReferences
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

describe('MaintenanceService MRO foundation', () => {
  it('derives MRO command-center priority queues and readiness metrics from live maintenance data', async () => {
    const env = await createSeededTestServices();
    const aogPackage = env.services.maintenance.createWorkPackage(
      {
        aircraftId: 'ac-pk-ama',
        title: 'AOG command center priority package',
        priority: 'AOG',
        executionMode: 'INTERNAL',
        planningNote: 'AOG package created by command-center test.'
      },
      maintenance
    );
    const blockedPackage = env.services.maintenance.createWorkPackage(
      {
        aircraftId: 'ac-pk-amf',
        title: 'Blocked command center priority package',
        priority: 'HIGH',
        executionMode: 'INTERNAL',
        planningNote: 'Package intentionally has no mandatory job card for release readiness.'
      },
      maintenance
    );
    const dashboard = env.services.maintenance.commandCenter();

    expect(dashboard.topPriorityItem).toMatchObject({
      id: aogPackage.id,
      bucket: 'AOG',
      priority: 'AOG'
    });
    expect(dashboard.priorityWorkPackages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: aogPackage.id,
          bucket: 'AOG',
          blockerCategories: expect.arrayContaining(['WORK'])
        }),
        expect.objectContaining({
          id: blockedPackage.id,
          bucket: 'RELEASE_BLOCKER'
        })
      ])
    );
    expect(dashboard.releaseReadinessMix).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'READY_TO_RELEASE',
          count: dashboard.summary.readyForRelease
        }),
        expect.objectContaining({
          key: 'WAITING_MATERIAL',
          count: expect.any(Number)
        })
      ])
    );
    expect(dashboard.releaseReadinessMix.reduce((sum, item) => sum + item.count, 0)).toBe(
      dashboard.summary.activeWorkPackages
    );
    const dueTotal = dashboard.dueControl.length;
    const dueOverdue = dashboard.dueControl.filter((item) => item.status === 'OVERDUE').length;
    expect(dashboard.onTimePerformancePct).toBe(
      dueTotal ? Number((((dueTotal - dueOverdue) / dueTotal) * 100).toFixed(1)) : 100
    );
    expect(
      dashboard.dueInspectionTasks.every(
        (item) =>
          item.dueAt !== null || ['Flight hours', 'Flight cycles'].includes(item.dueBasisLabel)
      )
    ).toBe(true);
    expect(
      dashboard.dueInspectionTasks
        .map((item) => item.dueAt)
        .filter((value): value is string => Boolean(value))
    ).toEqual(
      [
        ...dashboard.dueInspectionTasks
          .map((item) => item.dueAt)
          .filter((value): value is string => Boolean(value))
      ].sort()
    );

    env.sqlite.close();
  });

  it('requires matching PT AMA authorization in addition to a valid mechanic licence', async () => {
    const cases = [
      {
        label: 'missing authorization',
        seed: (sqlite: Database.Database) =>
          seedMaintenanceManagerAuthorization(sqlite, { withAuthorization: false }),
        expectedCode: 'COMPANY_AUTHORIZATION_REQUIRED'
      },
      {
        label: 'inactive authorization',
        seed: (sqlite: Database.Database) =>
          seedMaintenanceManagerAuthorization(sqlite, { authorizationStatus: 'INACTIVE' }),
        expectedCode: 'COMPANY_AUTHORIZATION_INACTIVE'
      },
      {
        label: 'wrong action',
        seed: (sqlite: Database.Database) =>
          seedMaintenanceManagerAuthorization(sqlite, {
            permittedActions: ['INDEPENDENT_INSPECTION']
          }),
        expectedCode: 'COMPANY_AUTHORIZATION_ACTION_NOT_PERMITTED'
      },
      {
        label: 'wrong aircraft scope',
        seed: (sqlite: Database.Database) =>
          seedMaintenanceManagerAuthorization(sqlite, {
            aircraftTypeScope: ['Cessna Caravan 208B', 'Pilatus PC-6', 'PAC 750XL'],
            aircraftRegistrationScope: ['PK-NOT-AUTH']
          }),
        expectedCode: 'COMPANY_AUTHORIZATION_AIRCRAFT_SCOPE_MISMATCH'
      }
    ] as const;

    for (const item of cases) {
      const env = await createSeededTestServices();
      item.seed(env.sqlite);
      const card = createStartedJobCard(env, item.label.replaceAll(/\s+/gu, '-'));
      let thrown: unknown = null;
      try {
        env.services.maintenance.signWork(
          card.id,
          {
            expectedVersion: card.version,
            certifyingLicenseNumber: 'AME-MECH-MRO-001',
            statement: 'Mechanic action attempted with authorization lite validation.',
            evidenceReferences: ['AUTH-LITE-EVIDENCE']
          },
          maintenance
        );
      } catch (error) {
        thrown = error;
      }
      expect(thrown, item.label).toEqual(expect.objectContaining({ code: item.expectedCode }));
      expect(
        (
          env.sqlite
            .prepare(
              'SELECT COUNT(*) AS count FROM maintenance_job_card_signoffs WHERE job_card_id = ?'
            )
            .get(card.id) as { count: number }
        ).count
      ).toBe(0);
      env.sqlite.close();
    }
  });

  it('stores a PT AMA authorization snapshot when mechanic sign-off is accepted', async () => {
    const env = await createSeededTestServices();
    seedMaintenanceManagerAuthorization(env.sqlite);
    const card = createStartedJobCard(env, 'snapshot');
    const signed = env.services.maintenance.signWork(
      card.id,
      {
        expectedVersion: card.version,
        certifyingLicenseNumber: 'AME-MECH-MRO-001',
        statement: 'Mechanic work completed with PT AMA authorization verification.',
        evidenceReferences: ['AUTH-LITE-SNAPSHOT']
      },
      maintenance
    );
    expect(signed.jobCards[0]?.signoffs[0]).toMatchObject({
      certifyingLicenseNumber: 'AME-MECH-MRO-001',
      companyAuthorizationSnapshot: expect.objectContaining({
        companyAuthorizationValidated: true,
        companyAuthorizationNumber: 'PTAMA-MRO-AUTH-MECH-001',
        permittedAction: 'MECHANIC_SIGN_OFF'
      })
    });
    env.sqlite.close();
  });

  it('runs the controlled vertical slice from defect assessment to certifying release', async () => {
    const { services, sqlite } = await createSeededTestServices();
    seedControlledMaintenanceActors(sqlite);
    const aircraftBefore = services.aircraftAirworthiness.detail('ac-pk-ama').aircraft;

    const grounded = services.aircraftAirworthiness.reportDefect(
      'ac-pk-ama',
      {
        title: 'Hydraulic seepage',
        description:
          'Pilot reported hydraulic seepage from the left main gear bay after flight closure.',
        detectedAt: context.at(0, '09:15'),
        sourceReference: 'TECHLOG-AMA-MRO-001',
        evidenceReferences: ['TECHLOG-AMA-MRO-001'],
        expectedVersion: aircraftBefore.version
      },
      occ
    );
    const defectId = grounded.defects[0]!.id;

    const assessment = services.maintenance.assessDefect(
      defectId,
      {
        assessmentDecision: 'GROUND',
        assessmentNote:
          'Maintenance Control assessment confirms defect requires rectification before release.'
      },
      maintenance
    );
    expect(assessment).toMatchObject({
      defectId,
      aircraftId: 'ac-pk-ama',
      assessmentDecision: 'GROUND'
    });

    const createdPackage = services.maintenance.createWorkPackage(
      {
        aircraftId: 'ac-pk-ama',
        primaryDefectId: defectId,
        title: 'Rectify left main gear bay hydraulic seepage',
        priority: 'HIGH',
        executionMode: 'INTERNAL',
        planningNote: 'Demo MRO Foundation v1 package for controlled release chain.'
      },
      maintenance
    );
    expect(createdPackage).toMatchObject({
      aircraftId: 'ac-pk-ama',
      primaryDefectId: defectId,
      status: 'OPEN',
      version: 1
    });

    const withCard = services.maintenance.addJobCard(
      createdPackage.id,
      {
        title: 'Inspect and rectify hydraulic seepage at left main gear bay',
        taskType: 'DEFECT_RECTIFICATION',
        maintenanceDataRef: 'AMM 29-10-00 demo extract',
        maintenanceDataRevision: 'REV-DEMO-2026-08',
        mandatoryFlag: true,
        requiresIndependentInspection: true,
        expectedWorkPackageVersion: createdPackage.version
      },
      maintenance
    );
    const jobCard = withCard.jobCards[0]!;
    expect(jobCard).toMatchObject({
      status: 'READY',
      requiresIndependentInspection: true,
      version: 1
    });

    const started = services.maintenance.startJobCard(
      jobCard.id,
      { expectedVersion: jobCard.version },
      maintenance
    );
    const startedCard = started.jobCards[0]!;
    expect(startedCard.status).toBe('IN_PROGRESS');

    const signed = services.maintenance.signWork(
      jobCard.id,
      {
        expectedVersion: startedCard.version,
        certifyingLicenseNumber: 'AME-MECH-MRO-001',
        statement:
          'Leak source cleaned, inspected, rectified, and operational check completed satisfactorily.',
        evidenceReferences: ['JC-EVIDENCE-MRO-001']
      },
      maintenance
    );
    const signedCard = signed.jobCards[0]!;
    expect(signedCard).toMatchObject({
      status: 'INSPECTION_REQUIRED',
      signoffs: [expect.objectContaining({ signoffType: 'MECHANIC' })]
    });

    expect(() =>
      services.maintenance.inspectJobCard(
        jobCard.id,
        inspectionInput('SELF', signedCard.version, {
          statement: 'Self inspection should be blocked by independent inspection control.',
          evidenceReferences: ['JC-EVIDENCE-MRO-SELF']
        }),
        maintenance
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_INSPECTION_SELF_SIGNOFF' }));

    const inspected = services.maintenance.inspectJobCard(
      jobCard.id,
      inspectionInput('MRO-001', signedCard.version, {
        statement:
          'Independent inspection completed; hydraulic bay area confirmed serviceable for release.'
      }),
      certifier
    );
    const inspectedCard = inspected.jobCards[0]!;
    expect(inspectedCard).toMatchObject({
      status: 'READY_FOR_RELEASE_REVIEW'
    });
    expect(inspectedCard.signoffs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ signoffType: 'MECHANIC' }),
        expect.objectContaining({ signoffType: 'INDEPENDENT_INSPECTION', decision: 'PASSED' })
      ])
    );

    expect(() =>
      sqlite.prepare("UPDATE maintenance_job_card_signoffs SET statement = 'tampered'").run()
    ).toThrow(/immutable/);

    const readyForRelease = services.maintenance.requestRelease(
      createdPackage.id,
      { expectedVersion: inspected.version },
      maintenance
    );
    expect(readyForRelease).toMatchObject({
      status: 'READY_FOR_RELEASE',
      version: inspected.version + 1
    });

    const released = services.maintenance.releaseWorkPackage(
      createdPackage.id,
      {
        expectedVersion: readyForRelease.version,
        releaseNumber: 'RTS-MRO-AMA-001',
        resultingStatus: 'SERVICEABLE',
        releaseStatement:
          'Aircraft is released to service after completion of the controlled demo MRO work package.',
        certifyingLicenseNumber: 'AME-CERT-MRO-001',
        releasedAt: context.at(0, '08:45'),
        evidenceReferences: ['MWP-RELEASE-MRO-001', 'INSP-EVIDENCE-MRO-001'],
        idempotencyKey: 'mro-release-vertical-001'
      },
      certifier
    );

    expect(released).toMatchObject({
      status: 'RELEASED',
      financialStatus: 'READY_FOR_HANDOFF',
      releaseId: expect.any(String)
    });
    const airworthinessAfterRelease = services.aircraftAirworthiness.detail('ac-pk-ama');
    expect(airworthinessAfterRelease.aircraft).toMatchObject({
      serviceabilityStatus: 'SERVICEABLE',
      technicalEligibility: 'ELIGIBLE'
    });
    expect(airworthinessAfterRelease.releases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          releaseNumber: 'RTS-MRO-AMA-001',
          signerAuthorizationSnapshot: expect.objectContaining({
            personnelId: expect.any(String),
            licenseNumber: 'AME-CERT-MRO-001',
            companyAuthorizationValidated: true,
            companyAuthorizationNumber: 'PTAMA-MRO-AUTH-REL-001'
          })
        })
      ])
    );

    const claim = services.maintenance.claimFinancialSource(
      released.id,
      'INVENTORY_MOVEMENT',
      'imove-demo-maintenance-001',
      1250000,
      maintenance
    );
    expect(claim).toMatchObject({
      sourceType: 'INVENTORY_MOVEMENT',
      sourceId: 'imove-demo-maintenance-001',
      status: 'READY'
    });
    expect(() =>
      services.maintenance.claimFinancialSource(
        released.id,
        'INVENTORY_MOVEMENT',
        'imove-demo-maintenance-001',
        1250000,
        maintenance
      )
    ).toThrowError(
      expect.objectContaining({ code: 'MAINTENANCE_FINANCIAL_SOURCE_ALREADY_CLAIMED' })
    );

    sqlite.close();
  });

  it('blocks release request until mandatory independent inspection is complete', async () => {
    const { services, sqlite } = await createSeededTestServices();
    seedControlledMaintenanceActors(sqlite);
    const aircraftBefore = services.aircraftAirworthiness.detail('ac-pk-amf').aircraft;
    const grounded = services.aircraftAirworthiness.reportDefect(
      'ac-pk-amf',
      {
        title: 'Autopilot disconnect report',
        description: 'Pilot report requires rectification job card and independent inspection.',
        detectedAt: context.at(0, '10:00'),
        sourceReference: 'TECHLOG-AMF-MRO-002',
        evidenceReferences: ['TECHLOG-AMF-MRO-002'],
        expectedVersion: aircraftBefore.version
      },
      occ
    );
    services.maintenance.assessDefect(
      grounded.defects[0]!.id,
      {
        assessmentDecision: 'GROUND',
        assessmentNote:
          'Maintenance Control assessment confirms autopilot disconnect requires controlled MRO planning.'
      },
      maintenance
    );
    const workPackage = services.maintenance.createWorkPackage(
      {
        aircraftId: 'ac-pk-amf',
        primaryDefectId: grounded.defects[0]!.id,
        title: 'Autopilot disconnect defect rectification',
        priority: 'NORMAL',
        executionMode: 'INTERNAL'
      },
      maintenance
    );
    services.maintenance.addJobCard(
      workPackage.id,
      {
        title: 'Rectify autopilot disconnect report',
        taskType: 'DEFECT_RECTIFICATION',
        maintenanceDataRef: 'AMM 22-10-00 demo extract',
        maintenanceDataRevision: 'REV-DEMO-2026-08',
        mandatoryFlag: true,
        requiresIndependentInspection: true,
        expectedWorkPackageVersion: workPackage.version
      },
      maintenance
    );

    expect(() =>
      services.maintenance.requestRelease(workPackage.id, { expectedVersion: 2 }, maintenance)
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_RELEASE_INCOMPLETE_JOB_CARDS' }));

    sqlite.close();
  });

  it('records failed inspection, opens one rework action, and blocks release until re-inspection passes', async () => {
    const { services, sqlite } = await createSeededTestServices();
    seedControlledMaintenanceActors(sqlite);
    const aircraftBefore = services.aircraftAirworthiness.detail('ac-pk-amf').aircraft;
    const grounded = services.aircraftAirworthiness.reportDefect(
      'ac-pk-amf',
      {
        title: 'Flight control rigging check',
        description: 'Flight control rigging check requires independent inspection.',
        detectedAt: context.at(0, '10:20'),
        sourceReference: 'TECHLOG-MRO-FAILED-INSP',
        evidenceReferences: ['TECHLOG-MRO-FAILED-INSP'],
        expectedVersion: aircraftBefore.version
      },
      occ
    );
    services.maintenance.assessDefect(
      grounded.defects[0]!.id,
      {
        assessmentDecision: 'GROUND',
        assessmentNote:
          'Maintenance Control assessment confirms flight control rigging requires controlled MRO planning.'
      },
      maintenance
    );
    let workPackage = services.maintenance.createWorkPackage(
      {
        aircraftId: 'ac-pk-amf',
        primaryDefectId: grounded.defects[0]!.id,
        title: 'Flight control rigging rectification',
        priority: 'HIGH',
        executionMode: 'INTERNAL'
      },
      maintenance
    );
    workPackage = services.maintenance.addJobCard(
      workPackage.id,
      {
        title: 'Rectify and inspect flight control rigging',
        taskType: 'DEFECT_RECTIFICATION',
        maintenanceDataRef: 'AMM 27-10-00 demo extract',
        maintenanceDataRevision: 'REV-DEMO-2026-08',
        mandatoryFlag: true,
        requiresIndependentInspection: true,
        expectedWorkPackageVersion: workPackage.version
      },
      maintenance
    );
    let card = workPackage.jobCards[0]!;
    workPackage = services.maintenance.startJobCard(
      card.id,
      { expectedVersion: card.version },
      maintenance
    );
    card = workPackage.jobCards[0]!;
    workPackage = services.maintenance.signWork(
      card.id,
      {
        expectedVersion: card.version,
        certifyingLicenseNumber: 'AME-MECH-MRO-001',
        statement: 'Mechanic completed rigging rectification and control travel check.',
        evidenceReferences: ['JC-EVIDENCE-FAILED-INSP']
      },
      maintenance
    );
    card = workPackage.jobCards[0]!;

    const failedInput = inspectionInput('FAILED-INSP', card.version, {
      decision: 'FAILED',
      statement: 'Inspection found the rigging still outside demo tolerance.',
      idempotencyKey: 'mro-failed-inspection-test-key'
    });
    workPackage = services.maintenance.inspectJobCard(card.id, failedInput, certifier);
    card = workPackage.jobCards[0]!;
    expect(card.status).toBe('REJECTED_FOR_REWORK');
    expect(card.inspectionAttempts).toEqual([
      expect.objectContaining({
        attemptNumber: 1,
        cycleNumber: 1,
        result: 'FAILED',
        finding: 'Inspection found the rigging still outside demo tolerance.'
      })
    ]);
    expect(card.reworkActions).toEqual([
      expect.objectContaining({
        cycleNumber: 1,
        status: 'REWORK_REQUIRED',
        sourceInspectionAttemptId: card.inspectionAttempts[0]!.id
      })
    ]);
    expect(workPackage.releaseChecklist?.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MAINTENANCE_RELEASE_REWORK_REQUIRED' })
      ])
    );

    const replay = services.maintenance.inspectJobCard(card.id, failedInput, certifier);
    const replayCard = replay.jobCards[0]!;
    expect(replayCard.inspectionAttempts).toHaveLength(1);
    expect(replayCard.reworkActions).toHaveLength(1);

    expect(() =>
      sqlite
        .prepare("UPDATE maintenance_inspection_attempts SET result = 'PASSED' WHERE id = ?")
        .run(card.inspectionAttempts[0]!.id)
    ).toThrow(/immutable/);

    expect(() =>
      services.maintenance.requestRelease(
        workPackage.id,
        { expectedVersion: workPackage.version },
        maintenance
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_RELEASE_INCOMPLETE_JOB_CARDS' }));

    workPackage = services.maintenance.signReworkAction(
      card.reworkActions[0]!.id,
      {
        expectedVersion: workPackage.version,
        certifyingLicenseNumber: 'AME-MECH-MRO-001',
        correctiveActionDescription:
          'Corrected rigging adjustment and repeated flight-control travel check.',
        approvedDataRef: 'PTAMA-C208B-FCTL-27-10-DEMO REV A',
        statement: 'Corrective rigging work completed and prepared for independent re-inspection.',
        evidenceReferences: ['REWORK-CORRECTIVE-EVIDENCE']
      },
      maintenance
    );
    card = workPackage.jobCards[0]!;
    expect(card.status).toBe('INSPECTION_REQUIRED');
    expect(card.reworkActions[0]).toMatchObject({
      status: 'AWAITING_REINSPECTION',
      approvedDataRef: 'PTAMA-C208B-FCTL-27-10-DEMO REV A',
      mechanicSignoffUserId: maintenance.userId
    });

    expect(() =>
      services.maintenance.inspectJobCard(
        card.id,
        inspectionInput('SELF-REINSP', card.version, {
          statement: 'Corrective work signer must not perform the independent re-inspection.'
        }),
        maintenance
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_INSPECTION_SELF_SIGNOFF' }));

    expect(() =>
      services.maintenance.requestRelease(
        workPackage.id,
        { expectedVersion: workPackage.version },
        maintenance
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_RELEASE_INCOMPLETE_JOB_CARDS' }));
    expect(workPackage.releaseChecklist?.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MAINTENANCE_RELEASE_REINSPECTION_REQUIRED' })
      ])
    );

    workPackage = services.maintenance.inspectJobCard(
      card.id,
      inspectionInput('REINSP-PASS', card.version, {
        statement:
          'Re-inspection passed after corrective work; flight-control rigging is satisfactory.'
      }),
      certifier
    );
    card = workPackage.jobCards[0]!;
    expect(card.status).toBe('READY_FOR_RELEASE_REVIEW');
    expect(card.inspectionAttempts).toHaveLength(2);
    expect(card.inspectionAttempts[1]).toMatchObject({
      attemptNumber: 2,
      cycleNumber: 1,
      result: 'PASSED'
    });
    expect(card.reworkActions[0]).toMatchObject({ status: 'REINSPECTION_PASSED' });
    expect(workPackage.releaseChecklist?.blockers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MAINTENANCE_RELEASE_REINSPECTION_REQUIRED' })
      ])
    );

    workPackage = services.maintenance.requestRelease(
      workPackage.id,
      { expectedVersion: workPackage.version },
      maintenance
    );
    expect(workPackage.status).toBe('READY_FOR_RELEASE');

    const auditChain = services.maintenance.listAuditRecords({
      package: workPackage.packageNumber,
      limit: 20,
      offset: 0
    });
    expect(auditChain.items.map((record) => record.action)).toEqual(
      expect.arrayContaining([
        'INDEPENDENT_INSPECTION_FAILED',
        'REWORK_REQUIRED',
        'CORRECTIVE_WORK_SIGNED',
        'INDEPENDENT_INSPECTION_PASSED'
      ])
    );

    sqlite.close();
  });

  it('complies a linked completed maintenance requirement through scoped MRO release', async () => {
    const env = await createSeededTestServices();
    const { services, sqlite } = env;
    seedCertifyingPersonnel(sqlite);
    sqlite
      .prepare("UPDATE aircraft_maintenance_requirements SET status = 'VOID' WHERE aircraft_id = ?")
      .run('ac-pk-ama');
    const aircraft = services.aircraftAirworthiness.detail('ac-pk-ama').aircraft;
    services.aircraftAirworthiness.addMaintenanceRequirement(
      'ac-pk-ama',
      {
        requirementCode: 'MRO_LINKED_DUE',
        title: 'Demo linked due requirement',
        dueAt: context.date(0),
        dueAirframeHours: null,
        dueAirframeCycles: null,
        sourceReference: 'DEMO-MRO-LINKED-DUE',
        expectedVersion: aircraft.version
      },
      maintenance
    );
    const requirementId = latestRequirementId(sqlite, 'ac-pk-ama', 'MRO_LINKED_DUE');
    const { workPackage } = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-ama',
      releaseIndex: 'REQ-LINKED',
      withDefect: false,
      requirementId
    });
    const released = services.maintenance.releaseWorkPackage(
      workPackage.id,
      releaseInput('REQ-LINKED', workPackage.version, {
        idempotencyKey: 'mro-release-linked-requirement'
      }),
      certifier
    );
    const requirement = sqlite
      .prepare('SELECT status, release_id FROM aircraft_maintenance_requirements WHERE id = ?')
      .get(requirementId) as { status: string; release_id: string | null };
    expect(released.status).toBe('RELEASED');
    expect(requirement.status).toBe('COMPLIED');
    expect(requirement.release_id).toBe(released.releaseId);

    sqlite.close();
  });

  it('does not release against a linked requirement that is no longer active', async () => {
    const env = await createSeededTestServices();
    const { services, sqlite } = env;
    seedCertifyingPersonnel(sqlite);
    sqlite
      .prepare("UPDATE aircraft_maintenance_requirements SET status = 'VOID' WHERE aircraft_id = ?")
      .run('ac-pk-ama');
    const aircraft = services.aircraftAirworthiness.detail('ac-pk-ama').aircraft;
    services.aircraftAirworthiness.addMaintenanceRequirement(
      'ac-pk-ama',
      {
        requirementCode: 'MRO_LINKED_VOID_BEFORE_RELEASE',
        title: 'Demo linked requirement voided before release',
        dueAt: context.date(0),
        dueAirframeHours: null,
        dueAirframeCycles: null,
        sourceReference: 'DEMO-MRO-LINKED-VOID-BEFORE-RELEASE',
        expectedVersion: aircraft.version
      },
      maintenance
    );
    const requirementId = latestRequirementId(
      sqlite,
      'ac-pk-ama',
      'MRO_LINKED_VOID_BEFORE_RELEASE'
    );
    const { workPackage } = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-ama',
      releaseIndex: 'REQ-VOID',
      withDefect: false,
      requirementId
    });
    sqlite
      .prepare("UPDATE aircraft_maintenance_requirements SET status = 'VOID' WHERE id = ?")
      .run(requirementId);

    expect(() =>
      services.maintenance.releaseWorkPackage(
        workPackage.id,
        releaseInput('REQ-VOID', workPackage.version, {
          idempotencyKey: 'mro-release-linked-void-requirement'
        }),
        certifier
      )
    ).toThrowError(
      expect.objectContaining({ code: 'MAINTENANCE_RELEASE_REQUIREMENT_SCOPE_INVALID' })
    );
    const releaseCount = sqlite
      .prepare(
        'SELECT COUNT(*) AS count FROM aircraft_maintenance_releases WHERE release_number = ?'
      )
      .get('RTS-MRO-REQ-VOID') as { count: number };
    const requirement = sqlite
      .prepare('SELECT status, release_id FROM aircraft_maintenance_requirements WHERE id = ?')
      .get(requirementId) as { status: string; release_id: string | null };
    expect(releaseCount.count).toBe(0);
    expect(requirement).toEqual({ status: 'VOID', release_id: null });

    sqlite.close();
  });

  it('prevents one maintenance requirement from being linked to multiple work packages', async () => {
    const env = await createSeededTestServices();
    const { services, sqlite } = env;
    sqlite
      .prepare("UPDATE aircraft_maintenance_requirements SET status = 'VOID' WHERE aircraft_id = ?")
      .run('ac-pk-ama');
    const aircraft = services.aircraftAirworthiness.detail('ac-pk-ama').aircraft;
    services.aircraftAirworthiness.addMaintenanceRequirement(
      'ac-pk-ama',
      {
        requirementCode: 'MRO_SINGLE_SCOPE_REQUIREMENT',
        title: 'Demo requirement cannot be linked twice',
        dueAt: context.date(0),
        dueAirframeHours: null,
        dueAirframeCycles: null,
        sourceReference: 'DEMO-MRO-SINGLE-SCOPE',
        expectedVersion: aircraft.version
      },
      maintenance
    );
    const requirementId = latestRequirementId(sqlite, 'ac-pk-ama', 'MRO_SINGLE_SCOPE_REQUIREMENT');
    createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-ama',
      releaseIndex: 'REQ-LINK-ONE',
      withDefect: false,
      requirementId
    });
    let second = services.maintenance.createWorkPackage(
      {
        aircraftId: 'ac-pk-ama',
        title: 'Second package attempting duplicate requirement scope',
        priority: 'NORMAL',
        executionMode: 'INTERNAL'
      },
      maintenance
    );
    second = services.maintenance.addJobCard(
      second.id,
      {
        title: 'Second package scheduled task',
        taskType: 'SCHEDULED_TASK',
        maintenanceDataRef: 'AMM DEMO DUPLICATE SCOPE',
        maintenanceDataRevision: 'REV-DEMO-2026-08',
        mandatoryFlag: true,
        requiresIndependentInspection: false,
        expectedWorkPackageVersion: second.version
      },
      maintenance
    );

    expect(() =>
      services.maintenance.linkRequirementToJobCard(
        second.id,
        requirementId,
        second.jobCards[0]!.id,
        maintenance
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_REQUIREMENT_ALREADY_LINKED' }));

    sqlite.close();
  });

  it('does not clear unrelated due requirements and leaves them blocking readiness', async () => {
    const env = await createSeededTestServices();
    const { services, sqlite } = env;
    seedCertifyingPersonnel(sqlite);
    sqlite
      .prepare("UPDATE aircraft_maintenance_requirements SET status = 'VOID' WHERE aircraft_id = ?")
      .run('ac-pk-amf');
    let aircraft = services.aircraftAirworthiness.detail('ac-pk-amf').aircraft;
    services.aircraftAirworthiness.addMaintenanceRequirement(
      'ac-pk-amf',
      {
        requirementCode: 'MRO_LINKED_SCOPE',
        title: 'Demo linked scoped requirement',
        dueAt: context.date(0),
        dueAirframeHours: null,
        dueAirframeCycles: null,
        sourceReference: 'DEMO-MRO-LINKED-SCOPE',
        expectedVersion: aircraft.version
      },
      maintenance
    );
    aircraft = services.aircraftAirworthiness.detail('ac-pk-amf').aircraft;
    services.aircraftAirworthiness.addMaintenanceRequirement(
      'ac-pk-amf',
      {
        requirementCode: 'MRO_UNRELATED_OVERDUE',
        title: 'Demo unrelated overdue mandatory requirement',
        dueAt: context.date(-1),
        dueAirframeHours: null,
        dueAirframeCycles: null,
        sourceReference: 'DEMO-MRO-UNRELATED-OVERDUE',
        expectedVersion: aircraft.version
      },
      maintenance
    );
    const linkedRequirementId = latestRequirementId(sqlite, 'ac-pk-amf', 'MRO_LINKED_SCOPE');
    const unrelatedRequirementId = latestRequirementId(
      sqlite,
      'ac-pk-amf',
      'MRO_UNRELATED_OVERDUE'
    );
    const { workPackage } = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-amf',
      releaseIndex: 'REQ-BLOCKED',
      withDefect: false,
      requirementId: linkedRequirementId
    });

    expect(() =>
      services.maintenance.releaseWorkPackage(
        workPackage.id,
        releaseInput('REQ-BLOCKED', workPackage.version, {
          idempotencyKey: 'mro-release-unrelated-blocker'
        }),
        certifier
      )
    ).toThrowError(expect.objectContaining({ code: 'AIRCRAFT_RELEASE_BLOCKED' }));
    const requirements = sqlite
      .prepare(
        `SELECT id, status FROM aircraft_maintenance_requirements
	         WHERE id IN (?, ?)
	         ORDER BY id`
      )
      .all(linkedRequirementId, unrelatedRequirementId) as Array<{ id: string; status: string }>;
    const packageAfter = services.maintenance.getWorkPackage(workPackage.id);
    const releaseCount = sqlite
      .prepare(
        'SELECT COUNT(*) AS count FROM aircraft_maintenance_releases WHERE release_number = ?'
      )
      .get('RTS-MRO-REQ-BLOCKED') as { count: number };
    expect(requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: linkedRequirementId, status: 'ACTIVE' }),
        expect.objectContaining({ id: unrelatedRequirementId, status: 'ACTIVE' })
      ])
    );
    expect(packageAfter.status).toBe('READY_FOR_RELEASE');
    expect(releaseCount.count).toBe(0);
    expect(services.aircraftAirworthiness.detail('ac-pk-amf').aircraft.technicalEligibility).toBe(
      'BLOCKED'
    );

    sqlite.close();
  });

  it('prevents an empty package scope from clearing aircraft due items', async () => {
    const env = await createSeededTestServices();
    const { services, sqlite } = env;
    seedCertifyingPersonnel(sqlite);
    sqlite
      .prepare("UPDATE aircraft_maintenance_requirements SET status = 'VOID' WHERE aircraft_id = ?")
      .run('ac-pk-ama');
    const aircraft = services.aircraftAirworthiness.detail('ac-pk-ama').aircraft;
    services.aircraftAirworthiness.addMaintenanceRequirement(
      'ac-pk-ama',
      {
        requirementCode: 'MRO_EMPTY_SCOPE_DUE',
        title: 'Demo due requirement outside empty package scope',
        dueAt: context.date(0),
        dueAirframeHours: null,
        dueAirframeCycles: null,
        sourceReference: 'DEMO-MRO-EMPTY-SCOPE',
        expectedVersion: aircraft.version
      },
      maintenance
    );
    const requirementId = latestRequirementId(sqlite, 'ac-pk-ama', 'MRO_EMPTY_SCOPE_DUE');
    const { workPackage } = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-ama',
      releaseIndex: 'EMPTY-SCOPE',
      withDefect: false
    });

    expect(() =>
      services.maintenance.releaseWorkPackage(
        workPackage.id,
        releaseInput('EMPTY-SCOPE', workPackage.version, {
          idempotencyKey: 'mro-release-empty-scope'
        }),
        certifier
      )
    ).toThrowError(expect.objectContaining({ code: 'AIRCRAFT_RELEASE_BLOCKED' }));
    const requirement = sqlite
      .prepare('SELECT status, release_id FROM aircraft_maintenance_requirements WHERE id = ?')
      .get(requirementId) as { status: string; release_id: string | null };
    expect(requirement).toEqual({ status: 'ACTIVE', release_id: null });

    sqlite.close();
  });

  it('rolls back aircraft release if work-package update fails after release creation', async () => {
    const env = await createSeededTestServices();
    const { services, sqlite } = env;
    seedCertifyingPersonnel(sqlite);
    const { workPackage, defectId } = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-ama',
      releaseIndex: 'ROLLBACK',
      withDefect: true
    });
    sqlite.exec(`CREATE TEMP TRIGGER fail_mro_package_release
	      BEFORE UPDATE OF status ON maintenance_work_packages
	      WHEN NEW.status = 'RELEASED'
	      BEGIN
	        SELECT RAISE(ABORT, 'forced package release failure');
	      END`);

    expect(() =>
      services.maintenance.releaseWorkPackage(
        workPackage.id,
        releaseInput('ROLLBACK', workPackage.version, {
          idempotencyKey: 'mro-release-rollback-proof'
        }),
        certifier
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_RELEASE_TRANSACTION_FAILED' }));
    sqlite.exec('DROP TRIGGER fail_mro_package_release');
    const releaseCount = sqlite
      .prepare(
        'SELECT COUNT(*) AS count FROM aircraft_maintenance_releases WHERE release_number = ?'
      )
      .get('RTS-MRO-ROLLBACK') as { count: number };
    const packageAfter = services.maintenance.getWorkPackage(workPackage.id);
    const defectAfter = sqlite
      .prepare('SELECT status FROM aircraft_defects WHERE id = ?')
      .get(defectId) as { status: string };
    const aircraftAfter = services.aircraftAirworthiness.detail('ac-pk-ama').aircraft;
    expect(releaseCount.count).toBe(0);
    expect(packageAfter.status).toBe('READY_FOR_RELEASE');
    expect(packageAfter.releaseId).toBeNull();
    expect(defectAfter.status).toBe('OPEN');
    expect(aircraftAfter.serviceabilityStatus).toBe('UNSERVICEABLE');

    sqlite.close();
  });

  it('rejects signer credentials that are missing, expired, suspended, revoked, mismatched, or owned by another user', async () => {
    const cases = [
      {
        label: 'permission without licence',
        seed: (sqlite: Database.Database) => {
          sqlite
            .prepare(
              "DELETE FROM personnel_qualifications WHERE personnel_id = 'crew-certifying-staff'"
            )
            .run();
          sqlite
            .prepare("DELETE FROM personnel_licenses WHERE personnel_id = 'crew-certifying-staff'")
            .run();
        },
        licenseNumber: 'AME-CERT-MRO-001'
      },
      {
        label: 'expired licence',
        seed: (sqlite: Database.Database) =>
          seedCertifyingPersonnel(sqlite, { expiryDate: context.date(-1) }),
        licenseNumber: 'AME-CERT-MRO-001'
      },
      {
        label: 'suspended licence',
        seed: (sqlite: Database.Database) =>
          seedCertifyingPersonnel(sqlite, { licenseStatus: 'SUSPENDED' }),
        licenseNumber: 'AME-CERT-MRO-001'
      },
      {
        label: 'revoked licence',
        seed: (sqlite: Database.Database) =>
          seedCertifyingPersonnel(sqlite, { licenseStatus: 'REVOKED' }),
        licenseNumber: 'AME-CERT-MRO-001'
      },
      {
        label: 'mismatched licence free text',
        seed: (sqlite: Database.Database) =>
          seedCertifyingPersonnel(sqlite, { licenseNumber: 'AME-CERT-MRO-ACTUAL' }),
        licenseNumber: 'AME-CERT-MRO-FREETEXT'
      },
      {
        label: "another user's licence",
        seed: (sqlite: Database.Database) => {
          seedCertifyingPersonnel(sqlite, { licenseNumber: 'AME-CERT-MRO-OWN' });
          seedCertifyingPersonnel(sqlite, {
            actorUserId: 'USR-OTHER-CERTIFIER',
            personnelId: 'crew-other-certifier',
            licenseNumber: 'AME-CERT-MRO-OTHER'
          });
        },
        licenseNumber: 'AME-CERT-MRO-OTHER'
      }
    ] as const;

    for (const item of cases) {
      const env = await createSeededTestServices();
      const { services, sqlite } = env;
      item.seed(sqlite);
      const { workPackage } = createReadyWorkPackage(env, {
        aircraftId: 'ac-pk-ama',
        releaseIndex: item.label.replaceAll(/\s+/gu, '-').toUpperCase(),
        withDefect: true,
        seedActors: false
      });
      expect(() =>
        services.maintenance.releaseWorkPackage(
          workPackage.id,
          releaseInput(item.label.replaceAll(/\s+/gu, '-').toUpperCase(), workPackage.version, {
            certifyingLicenseNumber: item.licenseNumber,
            idempotencyKey: `mro-release-${item.label.replaceAll(/\s+/gu, '-')}`
          }),
          certifier
        )
      ).toThrowError(expect.objectContaining({ statusCode: 422 }));
      sqlite.close();
    }
  });

  it('enforces existing aircraft/type qualification scope when present', async () => {
    const env = await createSeededTestServices();
    const { services, sqlite } = env;
    seedCertifyingPersonnel(sqlite, { qualificationReferenceId: 'NON_MATCHING_TYPE' });
    const { workPackage } = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-ama',
      releaseIndex: 'SCOPE-MISMATCH',
      withDefect: true
    });

    expect(() =>
      services.maintenance.releaseWorkPackage(
        workPackage.id,
        releaseInput('SCOPE-MISMATCH', workPackage.version, {
          idempotencyKey: 'mro-release-scope-mismatch'
        }),
        certifier
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_RELEASE_AIRCRAFT_SCOPE_INVALID' }));

    sqlite.close();
  });

  it('rejects expired or suspended existing aircraft/type qualification scope', async () => {
    const cases = [
      {
        label: 'expired scope',
        qualificationStatus: 'EXPIRED' as const,
        qualificationExpiresAt: context.date(-1)
      },
      {
        label: 'suspended scope',
        qualificationStatus: 'SUSPENDED' as const,
        qualificationExpiresAt: context.date(60)
      }
    ];

    for (const item of cases) {
      const env = await createSeededTestServices();
      const { services, sqlite } = env;
      seedCertifyingPersonnel(sqlite, {
        qualificationReferenceId: 'Pilatus PC-6',
        qualificationStatus: item.qualificationStatus,
        qualificationExpiresAt: item.qualificationExpiresAt
      });
      const { workPackage } = createReadyWorkPackage(env, {
        aircraftId: 'ac-pk-ama',
        releaseIndex: item.label.replaceAll(/\s+/gu, '-').toUpperCase(),
        withDefect: true
      });

      expect(() =>
        services.maintenance.releaseWorkPackage(
          workPackage.id,
          releaseInput(item.label.replaceAll(/\s+/gu, '-').toUpperCase(), workPackage.version, {
            idempotencyKey: `mro-release-${item.label.replaceAll(/\s+/gu, '-')}`
          }),
          certifier
        )
      ).toThrowError(
        expect.objectContaining({ code: 'MAINTENANCE_RELEASE_AIRCRAFT_SCOPE_INVALID' })
      );

      sqlite.close();
    }
  });

  it('returns the same released package for repeated idempotency key without duplicate release', async () => {
    const env = await createSeededTestServices();
    const { services, sqlite } = env;
    seedCertifyingPersonnel(sqlite);
    const { workPackage } = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-ama',
      releaseIndex: 'IDEMPOTENT',
      withDefect: true
    });
    const input = releaseInput('IDEMPOTENT', workPackage.version, {
      idempotencyKey: 'mro-release-idempotent-repeat'
    });
    const first = services.maintenance.releaseWorkPackage(workPackage.id, input, certifier);
    const second = services.maintenance.releaseWorkPackage(workPackage.id, input, certifier);
    const releaseCount = sqlite
      .prepare(
        'SELECT COUNT(*) AS count FROM aircraft_maintenance_releases WHERE release_number = ?'
      )
      .get('RTS-MRO-IDEMPOTENT') as { count: number };
    const snapshotCount = sqlite
      .prepare(
        `SELECT COUNT(*) AS count
         FROM maintenance_release_eligibility_snapshots
         WHERE release_id = ?`
      )
      .get(first.releaseId) as { count: number };
    expect(second).toMatchObject({
      id: first.id,
      status: 'RELEASED',
      releaseId: first.releaseId
    });
    expect(releaseCount.count).toBe(1);
    expect(snapshotCount.count).toBe(1);

    sqlite.close();
  });

  it('rejects a repeated release command while the idempotency key is still in progress', async () => {
    const env = await createSeededTestServices();
    const { services, sqlite } = env;
    seedCertifyingPersonnel(sqlite);
    const { workPackage } = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-ama',
      releaseIndex: 'IDEMPOTENT-IN-PROGRESS',
      withDefect: true
    });
    const input = releaseInput('IDEMPOTENT-IN-PROGRESS', workPackage.version, {
      idempotencyKey: 'mro-release-idempotent-in-progress'
    });
    sqlite
      .prepare(
        `INSERT INTO maintenance_release_idempotency_keys (
	          id, command_type, idempotency_key, work_package_id, request_hash, actor_user_id, created_at
	        ) VALUES (?, 'MRO_TECHNICAL_RELEASE', ?, ?, ?, ?, ?)`
      )
      .run(
        'mrelidem-test-in-progress',
        input.idempotencyKey,
        workPackage.id,
        releaseRequestHash(workPackage.id, input),
        certifier.userId,
        context.at(0, '08:49')
      );

    expect(() =>
      services.maintenance.releaseWorkPackage(workPackage.id, input, certifier)
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_RELEASE_IN_PROGRESS' }));
    const releaseCount = sqlite
      .prepare(
        'SELECT COUNT(*) AS count FROM aircraft_maintenance_releases WHERE release_number = ?'
      )
      .get('RTS-MRO-IDEMPOTENT-IN-PROGRESS') as { count: number };
    expect(releaseCount.count).toBe(0);

    sqlite.close();
  });

  it('guards stale version, second release attempts, invalid transitions, locked mutations, and missing approved data', async () => {
    const env = await createSeededTestServices();
    const { services, sqlite } = env;
    seedCertifyingPersonnel(sqlite);
    const stale = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-ama',
      releaseIndex: 'STALE',
      withDefect: true
    });
    expect(() =>
      services.maintenance.releaseWorkPackage(
        stale.workPackage.id,
        releaseInput('STALE', stale.workPackage.version + 1, {
          idempotencyKey: 'mro-release-stale-version'
        }),
        certifier
      )
    ).toThrowError(expect.objectContaining({ code: 'STALE_VERSION' }));

    const concurrent = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-amf',
      releaseIndex: 'CONCURRENT',
      withDefect: true
    });
    const first = services.maintenance.releaseWorkPackage(
      concurrent.workPackage.id,
      releaseInput('CONCURRENT', concurrent.workPackage.version, {
        idempotencyKey: 'mro-release-concurrent-first'
      }),
      certifier
    );
    expect(() =>
      services.maintenance.releaseWorkPackage(
        concurrent.workPackage.id,
        releaseInput('CONCURRENT-SECOND', concurrent.workPackage.version, {
          idempotencyKey: 'mro-release-concurrent-second'
        }),
        certifier
      )
    ).toThrowError(expect.objectContaining({ code: 'STALE_VERSION' }));
    expect(
      (
        sqlite
          .prepare('SELECT COUNT(*) AS count FROM aircraft_maintenance_releases WHERE id = ?')
          .get(first.releaseId) as { count: number }
      ).count
    ).toBe(1);
    expect(() =>
      services.maintenance.addJobCard(
        first.id,
        {
          title: 'Attempt mutation after release',
          taskType: 'NON_ROUTINE',
          maintenanceDataRef: 'AMM DEMO LOCKED',
          maintenanceDataRevision: 'REV-DEMO-2026-08',
          mandatoryFlag: true,
          requiresIndependentInspection: false,
          expectedWorkPackageVersion: first.version
        },
        maintenance
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_PACKAGE_LOCKED' }));

    const invalidTransition = services.maintenance.createWorkPackage(
      {
        aircraftId: 'ac-pk-amg',
        title: 'Invalid direct release package',
        priority: 'NORMAL',
        executionMode: 'INTERNAL'
      },
      maintenance
    );
    expect(() =>
      services.maintenance.releaseWorkPackage(
        invalidTransition.id,
        releaseInput('INVALID-STATE', invalidTransition.version, {
          idempotencyKey: 'mro-release-invalid-state'
        }),
        certifier
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_PACKAGE_RELEASE_STATE_INVALID' }));

    let missingData = services.maintenance.createWorkPackage(
      {
        aircraftId: 'ac-pk-amg',
        title: 'Missing approved data package',
        priority: 'NORMAL',
        executionMode: 'INTERNAL'
      },
      maintenance
    );
    missingData = services.maintenance.addJobCard(
      missingData.id,
      {
        title: 'Mandatory job card with later removed approved data',
        taskType: 'SCHEDULED_TASK',
        maintenanceDataRef: 'AMM TEMP',
        maintenanceDataRevision: 'REV-TEMP',
        mandatoryFlag: true,
        requiresIndependentInspection: false,
        expectedWorkPackageVersion: missingData.version
      },
      maintenance
    );
    sqlite
      .prepare("UPDATE maintenance_job_cards SET maintenance_data_ref = '' WHERE id = ?")
      .run(missingData.jobCards[0]!.id);
    expect(() =>
      services.maintenance.requestRelease(
        missingData.id,
        { expectedVersion: missingData.version },
        maintenance
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_RELEASE_APPROVED_DATA_REQUIRED' }));

    sqlite.close();
  });

  it('keeps technical release independent from Finance processing and blocks Finance from issuing release', async () => {
    const env = await createSeededTestServices();
    const { services, sqlite } = env;
    seedCertifyingPersonnel(sqlite);
    const financeBlocked = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-ama',
      releaseIndex: 'FINANCE-BLOCKED',
      withDefect: true
    });
    expect(() =>
      services.maintenance.releaseWorkPackage(
        financeBlocked.workPackage.id,
        releaseInput('FINANCE-BLOCKED', financeBlocked.workPackage.version, {
          idempotencyKey: 'mro-release-finance-actor'
        }),
        finance
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_RELEASE_PERMISSION_REQUIRED' }));

    const isolated = createReadyWorkPackage(env, {
      aircraftId: 'ac-pk-amf',
      releaseIndex: 'FINANCE-SEPARATE',
      withDefect: true
    });
    const claimsBefore = sqlite
      .prepare('SELECT COUNT(*) AS count FROM maintenance_financial_claims')
      .get() as { count: number };
    sqlite.exec(`CREATE TEMP TRIGGER fail_mro_finance_claim
	      BEFORE INSERT ON maintenance_financial_claims
	      BEGIN
	        SELECT RAISE(ABORT, 'simulated finance claim failure');
	      END`);
    sqlite.exec(`CREATE TEMP TRIGGER fail_mro_accounting_event
	      BEFORE INSERT ON accounting_events
	      BEGIN
	        SELECT RAISE(ABORT, 'simulated accounting failure');
	      END`);
    const released = services.maintenance.releaseWorkPackage(
      isolated.workPackage.id,
      releaseInput('FINANCE-SEPARATE', isolated.workPackage.version, {
        idempotencyKey: 'mro-release-finance-separated'
      }),
      certifier
    );
    const claimsAfter = sqlite
      .prepare('SELECT COUNT(*) AS count FROM maintenance_financial_claims')
      .get() as { count: number };
    expect(released).toMatchObject({ status: 'RELEASED', releaseId: expect.any(String) });
    expect(claimsAfter.count).toBe(claimsBefore.count);
    sqlite.exec('DROP TRIGGER fail_mro_finance_claim');
    sqlite.exec('DROP TRIGGER fail_mro_accounting_event');

    sqlite.close();
  });
});
