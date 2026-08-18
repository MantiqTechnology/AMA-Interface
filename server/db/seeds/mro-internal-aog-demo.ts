import type Database from 'better-sqlite3';
import type { DemoSeedContext } from './context';

type Row = Record<string, string | number | null>;

function insertIgnore(sqlite: Database.Database, table: string, row: Row) {
  const keys = Object.keys(row);
  const columns = keys.map((key) => key.replace(/[A-Z]/gu, (letter) => `_${letter.toLowerCase()}`));
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${keys
        .map((key) => `@${key}`)
        .join(', ')})`
    )
    .run(row);
}

export function seedInternalAogDemo(sqlite: Database.Database, context: DemoSeedContext) {
  const seedNow = context.now;
  const seed = sqlite.transaction(() => {
    insertIgnore(sqlite, 'aircraft_defects', {
      id: 'mroaog-defect',
      aircraftId: 'ac-pk-amd',
      defectNumber: 'DEF-AOG-INT-001',
      title: 'AOG main wheel tire replacement',
      description:
        'Aircraft grounded pending issue and installation of the required main wheel tire.',
      detectedAt: context.at(-1, '08:10'),
      detectedByUserId: 'USR-MAINTENANCE-TECHNICIAN',
      sourceReference: 'INTERNAL-AOG-SCENARIO',
      status: 'OPEN',
      createdAt: context.at(-1, '08:10'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_defect_assessments', {
      id: 'mroaog-defect-assessment',
      defectId: 'mroaog-defect',
      aircraftId: 'ac-pk-amd',
      assessmentDecision: 'GROUND',
      assessmentNote: 'Aircraft remains grounded until the controlled work is released.',
      assessedByUserId: 'USR-MAINTENANCE-MANAGER',
      assessedAt: context.at(-1, '08:20'),
      requestId: 'mroaog-seed'
    });

    insertIgnore(sqlite, 'maintenance_work_packages', {
      id: 'mroaog-work-package',
      packageNumber: 'MWP-AOG-INT-001',
      aircraftId: 'ac-pk-amd',
      sourceFlightId: null,
      primaryDefectId: 'mroaog-defect',
      sourceDueRequirementId: null,
      sourceDueStatusId: null,
      title: 'Internal AOG main wheel tire replacement',
      priority: 'AOG',
      executionMode: 'INTERNAL',
      vendorId: null,
      status: 'IN_PROGRESS',
      planningNote: 'Internal AOG scenario. Material issue is the only initial readiness blocker.',
      releaseId: null,
      releasedAt: null,
      financialStatus: 'NOT_READY',
      version: 1,
      createdByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '08:30'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_job_cards', {
      id: 'mroaog-job-card',
      workPackageId: 'mroaog-work-package',
      sourceNonRoutineFindingId: null,
      cardNumber: 'MWP-AOG-INT-001-JC-001',
      title: 'Replace main wheel tire and inspect installation',
      taskType: 'COMPONENT_CHANGE',
      maintenanceDataRef: 'AMM C208B 32-40-00',
      maintenanceDataRevision: 'REV-MROV2-ACTIVE',
      mandatoryFlag: 1,
      requiresIndependentInspection: 1,
      status: 'READY',
      version: 1,
      createdByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '08:35'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_job_card_approved_data_links', {
      id: 'mroaog-approved-data-link',
      jobCardId: 'mroaog-job-card',
      approvedDataRevisionId: 'mdata-rev-amm-c208-active',
      usageNote: 'Fictional controlled reference for the tire replacement task.',
      snapshotDocumentNumber: 'AMM-C208B-MROV2',
      snapshotRevision: 'REV-MROV2-ACTIVE',
      snapshotEffectiveDate: context.date(-30),
      createdAt: context.at(-1, '08:35')
    });

    for (const declaration of [
      ['mroaog-declaration-material', 'MATERIAL'],
      ['mroaog-declaration-tool', 'TOOL'],
      ['mroaog-declaration-personnel', 'PERSONNEL']
    ] as const) {
      insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
        id: declaration[0],
        workPackageId: 'mroaog-work-package',
        resourceType: declaration[1],
        declaration: 'REQUIRED',
        reason: null,
        evidenceDocumentId: null,
        declaredBy: 'USR-MAINTENANCE-MANAGER',
        declaredAt: context.at(-1, '08:40'),
        updatedAt: seedNow
      });
    }

    insertIgnore(sqlite, 'maintenance_work_package_material_requirements', {
      id: 'mroaog-material-requirement',
      workPackageId: 'mroaog-work-package',
      jobCardId: 'mroaog-job-card',
      partId: 'inv-part-tire-c208-reserve',
      serializedPartId: null,
      requiredQuantity: 1,
      required: 1,
      status: 'REQUESTED',
      source: 'INTERNAL_AOG_SCENARIO',
      notes: 'Issue one serviceable C208B main wheel tire to clear the AOG material gate.',
      createdAt: context.at(-1, '08:45'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_tool_requirements', {
      id: 'mroaog-tool-requirement',
      workPackageId: 'mroaog-work-package',
      jobCardId: 'mroaog-job-card',
      toolMasterId: 'mtool-mrov2-calibrated',
      toolType: 'TORQUE_TOOL',
      quantity: 1,
      requiredStationId: 'st-djj',
      requiredFrom: context.at(-1, '09:00'),
      requiredUntil: context.at(0, '18:00'),
      status: 'ALLOCATED',
      createdBy: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '08:45'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_tool_allocations_v2', {
      id: 'mroaog-tool-allocation',
      toolRequirementId: 'mroaog-tool-requirement',
      toolId: 'mtool-mrov2-calibrated',
      workPackageId: 'mroaog-work-package',
      jobCardId: 'mroaog-job-card',
      aircraftId: 'ac-pk-amd',
      stationId: 'st-djj',
      status: 'ALLOCATED',
      allocatedBy: 'USR-MAINTENANCE-MANAGER',
      allocatedAt: context.at(-1, '08:50'),
      custodianPersonnelId: 'crew-maintenance-technician',
      custodyStartedAt: null,
      returnedBy: null,
      returnedAt: null,
      returnCondition: null,
      returnNote: null,
      createIdempotencyKey: 'mroaog-tool-allocation-seed',
      createdAt: context.at(-1, '08:50'),
      updatedAt: seedNow
    });

    for (const requirement of [
      {
        id: 'mroaog-personnel-mechanic',
        roleType: 'MECHANIC',
        authorization: 'MECHANIC_SIGN_OFF',
        personnelId: 'crew-maintenance-technician'
      },
      {
        id: 'mroaog-personnel-inspector',
        roleType: 'INSPECTOR',
        authorization: 'INDEPENDENT_INSPECTION',
        personnelId: 'crew-certifying-staff'
      }
    ] as const) {
      insertIgnore(sqlite, 'maintenance_personnel_requirements', {
        id: requirement.id,
        workPackageId: 'mroaog-work-package',
        jobCardId: 'mroaog-job-card',
        roleType: requirement.roleType,
        requiredCount: 1,
        requiredLicenceType: 'AMEL',
        requiredQualification: 'Cessna Caravan 208B',
        requiredAuthorization: requirement.authorization,
        aircraftType: 'Cessna Caravan 208B',
        dutyStationId: 'st-djj',
        requiredFrom: context.at(-1, '09:00'),
        requiredUntil: context.at(0, '18:00'),
        status: 'FULFILLED',
        createdBy: 'USR-MAINTENANCE-MANAGER',
        createdAt: context.at(-1, '08:45'),
        updatedAt: seedNow
      });
      insertIgnore(sqlite, 'maintenance_personnel_assignments', {
        id: `${requirement.id}-assignment`,
        personnelRequirementId: requirement.id,
        personnelId: requirement.personnelId,
        workPackageId: 'mroaog-work-package',
        jobCardId: 'mroaog-job-card',
        roleType: requirement.roleType,
        status: 'CONFIRMED',
        eligibilityStatus: 'ELIGIBLE',
        eligibilitySnapshotJson: JSON.stringify({
          licenceValid: true,
          qualificationValid: true,
          authorizationValid: true,
          evaluatedAt: context.at(-1, '08:50')
        }),
        assignedBy: 'USR-MAINTENANCE-MANAGER',
        assignedAt: context.at(-1, '08:50'),
        confirmedAt: context.at(-1, '08:55'),
        releasedAt: null,
        createIdempotencyKey: `${requirement.id}-seed`,
        createdAt: context.at(-1, '08:50'),
        updatedAt: seedNow
      });
    }

    for (const audit of [
      {
        id: 'mroaog-audit-defect',
        entityType: 'AIRCRAFT_DEFECT',
        entityId: 'mroaog-defect',
        action: 'DEFECT_REPORTED',
        actorRole: 'Maintenance Technician',
        occurredAt: context.at(-1, '08:10')
      },
      {
        id: 'mroaog-audit-package',
        entityType: 'WORK_PACKAGE',
        entityId: 'mroaog-work-package',
        action: 'WORK_PACKAGE_CREATED',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '08:30')
      },
      {
        id: 'mroaog-audit-readiness',
        entityType: 'WORK_PACKAGE',
        entityId: 'mroaog-work-package',
        action: 'READINESS_EVALUATED',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '08:55')
      }
    ] as const) {
      insertIgnore(sqlite, 'maintenance_audit_logs', {
        id: audit.id,
        entityType: audit.entityType,
        entityId: audit.entityId,
        action: audit.action,
        actorUserId:
          audit.actorRole === 'Maintenance Technician'
            ? 'USR-MAINTENANCE-TECHNICIAN'
            : 'USR-MAINTENANCE-MANAGER',
        actorRole: audit.actorRole,
        requestId: 'mroaog-seed',
        beforeVersion: null,
        afterVersion: 1,
        metadataJson: JSON.stringify({
          scenarioId: 'INTERNAL_AOG_MATERIAL',
          workPackageId: 'mroaog-work-package'
        }),
        occurredAt: audit.occurredAt
      });
    }
  });

  seed.immediate();
}
