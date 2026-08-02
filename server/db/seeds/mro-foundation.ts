import type Database from 'better-sqlite3';
import { createDemoSeedContext, type DemoSeedContext } from './context';

type Row = Record<string, string | number | null>;

const authorizationNotice = 'Licence and PT AMA authorization verified.';

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

function snapshot(
  context: DemoSeedContext,
  aircraftId: string,
  registration: string,
  type: string
) {
  return JSON.stringify({
    basis: authorizationNotice,
    actorUserId: 'USR-CERTIFYING-STAFF',
    actorRole: 'Certifying Staff',
    personnelId: 'crew-certifying-staff',
    personnelName: 'Bima Ardiansyah',
    licenseId: 'plic-crew-certifying-staff',
    licenseType: 'AMEL',
    licenseNumber: 'AME-CERT-MRO-001',
    licenseStatus: 'ACTIVE',
    licenseExpiryDate: context.date(365),
    releasedAt: context.at(-1, '11:40'),
    aircraftId,
    aircraftRegistrationNumber: registration,
    aircraftType: type,
    aircraftModel: type.includes('Cessna') ? 'Caravan 208B' : 'PC-6 Porter',
    companyAuthorizationValidated: false,
    companyAuthorizationId: null,
    companyAuthorizationNumber: null,
    permittedAction: null,
    companyAuthorizationStatus: null,
    companyAuthorizationValidFrom: null,
    companyAuthorizationValidUntil: null,
    companyAuthorizationBlocker: 'Legacy record — company authorization snapshot unavailable.',
    authorizationEvaluationAt: context.at(-1, '11:40'),
    commandCorrelationId: 'seed-mrov1',
    aircraftScope: {
      registryAvailable: true,
      enforced: true,
      matchedQualificationId: type.includes('Cessna')
        ? 'pqual-crew-certifying-staff-c208b-full'
        : 'pqual-crew-certifying-staff-pc6-full',
      reason: 'Existing personnel qualification scope matched the aircraft/type/rating.'
    }
  });
}

export function seedMroFoundationData(
  sqlite: Database.Database,
  context: DemoSeedContext = createDemoSeedContext()
) {
  const seedNow = context.now;
  const seed = sqlite.transaction(() => {
    insertIgnore(sqlite, 'crews', {
      id: 'crew-maintenance-manager',
      employeeCode: 'USR-MAINTENANCE-MANAGER',
      fullName: 'Raka Wibisana',
      crewRole: 'GROUND_CREW',
      licenseType: 'AMEL',
      licenseNumber: 'AME-MECH-MRO-001',
      licenseExpiryDate: context.date(365),
      medicalExpiryDate: context.date(365),
      baseStationId: 'st-djj',
      dutyStationId: 'st-djj',
      unit: 'Maintenance Control',
      availabilityStatus: 'AVAILABLE',
      employmentStatus: 'PERMANENT',
      isActive: 1,
      readinessNote: 'MRO mechanic persona for PT AMA maintenance sign-off.',
      createdAt: seedNow,
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'personnel_licenses', {
      id: 'plic-crew-maintenance-manager',
      personnelId: 'crew-maintenance-manager',
      licenseType: 'AMEL',
      licenseNumber: 'AME-MECH-MRO-001',
      issuingAuthority: 'Directorate General of Civil Aviation',
      issueDate: context.date(-180),
      expiryDate: context.date(365),
      isPrimary: 1,
      status: 'ACTIVE',
      documentId: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    for (const scope of ['Cessna Caravan 208B', 'Pilatus PC-6', 'PAC 750XL']) {
      insertIgnore(sqlite, 'personnel_qualifications', {
        id: `pqual-crew-maintenance-manager-${scope.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-')}`,
        personnelId: 'crew-maintenance-manager',
        qualificationType: 'AIRCRAFT_TYPE',
        referenceType: 'AIRCRAFT_TYPE',
        referenceId: scope,
        issuedAt: context.date(-120),
        expiresAt: context.date(245),
        status: 'VALID',
        notes: 'Aircraft/type scope for PT AMA MRO mechanic authorization.',
        documentId: null,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    for (const authorization of [
      {
        id: 'mca-mrov1-mechanic',
        authorizationNumber: 'PTAMA-MRO-AUTH-MECH-001',
        personnelId: 'crew-maintenance-manager',
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        licenseId: 'plic-crew-maintenance-manager',
        licenseNumber: 'AME-MECH-MRO-001',
        status: 'ACTIVE',
        validFrom: context.date(-90),
        validUntil: context.date(180),
        permittedActionsJson: JSON.stringify(['MECHANIC_SIGN_OFF', 'REWORK_SIGN_OFF']),
        aircraftTypeScopeJson: JSON.stringify(['Cessna Caravan 208B', 'Pilatus PC-6', 'PAC 750XL']),
        aircraftRegistrationScopeJson: JSON.stringify([]),
        notes: 'PT AMA authorization for mechanic and corrective-work sign-off only.',
        issuedBy: 'PT AMA Maintenance Control',
        version: 1,
        createdAt: seedNow,
        updatedAt: seedNow
      },
      {
        id: 'mca-mrov1-inspector',
        authorizationNumber: 'PTAMA-MRO-AUTH-INSP-001',
        personnelId: 'crew-certifying-staff',
        actorUserId: 'USR-CERTIFYING-STAFF',
        licenseId: 'plic-crew-certifying-staff',
        licenseNumber: 'AME-CERT-MRO-001',
        status: 'ACTIVE',
        validFrom: context.date(-90),
        validUntil: context.date(180),
        permittedActionsJson: JSON.stringify([
          'INDEPENDENT_INSPECTION',
          'INDEPENDENT_REINSPECTION'
        ]),
        aircraftTypeScopeJson: JSON.stringify(['Cessna Caravan 208B', 'Pilatus PC-6', 'PAC 750XL']),
        aircraftRegistrationScopeJson: JSON.stringify([]),
        notes: 'PT AMA authorization for independent inspection and re-inspection.',
        issuedBy: 'PT AMA Maintenance Control',
        version: 1,
        createdAt: seedNow,
        updatedAt: seedNow
      },
      {
        id: 'mca-mrov1-release',
        authorizationNumber: 'PTAMA-MRO-AUTH-REL-001',
        personnelId: 'crew-certifying-staff',
        actorUserId: 'USR-CERTIFYING-STAFF',
        licenseId: 'plic-crew-certifying-staff',
        licenseNumber: 'AME-CERT-MRO-001',
        status: 'ACTIVE',
        validFrom: context.date(-90),
        validUntil: context.date(180),
        permittedActionsJson: JSON.stringify(['TECHNICAL_RELEASE']),
        aircraftTypeScopeJson: JSON.stringify(['Cessna Caravan 208B', 'Pilatus PC-6', 'PAC 750XL']),
        aircraftRegistrationScopeJson: JSON.stringify([]),
        notes: 'PT AMA authorization for technical release only.',
        issuedBy: 'PT AMA Maintenance Control',
        version: 1,
        createdAt: seedNow,
        updatedAt: seedNow
      },
      {
        id: 'mca-mrov1-inactive-example',
        authorizationNumber: 'PTAMA-MRO-AUTH-INACTIVE-001',
        personnelId: 'crew-certifying-staff',
        actorUserId: 'USR-CERTIFYING-STAFF',
        licenseId: 'plic-crew-certifying-staff',
        licenseNumber: 'AME-CERT-MRO-001',
        status: 'INACTIVE',
        validFrom: context.date(-90),
        validUntil: context.date(180),
        permittedActionsJson: JSON.stringify(['MECHANIC_SIGN_OFF']),
        aircraftTypeScopeJson: JSON.stringify(['Cessna Caravan 208B']),
        aircraftRegistrationScopeJson: JSON.stringify([]),
        notes: 'Valid licence without active authorization for mechanic sign-off.',
        issuedBy: 'PT AMA Maintenance Control',
        version: 1,
        createdAt: seedNow,
        updatedAt: seedNow
      }
    ] as const) {
      insertIgnore(sqlite, 'maintenance_company_authorizations', authorization);
      insertIgnore(sqlite, 'maintenance_audit_logs', {
        id: `maudit-${authorization.id}`,
        entityType: 'COMPANY_AUTHORIZATION',
        entityId: authorization.id,
        action: 'SEEDED',
        actorUserId: 'SYSTEM_SEED',
        actorRole: 'SYSTEM',
        requestId: 'seed-mrov1',
        beforeVersion: null,
        afterVersion: authorization.version,
        metadataJson: JSON.stringify({ authorizationNumber: authorization.authorizationNumber }),
        occurredAt: seedNow
      });
    }

    for (const aircraftRecord of [
      {
        id: 'ac-pk-mra',
        registrationNumber: 'PK-MRA',
        serialNumber: '208B-MRA-MROV1',
        aircraftType: 'Cessna Caravan 208B',
        manufacturer: 'Cessna',
        model: 'Caravan 208B',
        fleetCode: 'CVN-MRA',
        passengerCapacity: 12,
        cargoCapacityKg: 1400,
        serviceabilityStatus: 'UNSERVICEABLE',
        currentStationId: 'st-djj',
        serviceabilityNote:
          'Open MRO Foundation v1 technical defect requires controlled technical release.'
      },
      {
        id: 'ac-pk-mrb',
        registrationNumber: 'PK-MRB',
        serialNumber: '208B-MRB-MROV1',
        aircraftType: 'Cessna Caravan 208B',
        manufacturer: 'Cessna',
        model: 'Caravan 208B',
        fleetCode: 'CVN-MRB',
        passengerCapacity: 12,
        cargoCapacityKg: 1400,
        serviceabilityStatus: 'UNSERVICEABLE',
        currentStationId: 'st-djj',
        serviceabilityNote:
          'Assessed technical defect is available for contextual work-package creation.'
      },
      {
        id: 'ac-pk-mrc',
        registrationNumber: 'PK-MRC',
        serialNumber: '208B-MRC-MROV1',
        aircraftType: 'Cessna Caravan 208B',
        manufacturer: 'Cessna',
        model: 'Caravan 208B',
        fleetCode: 'CVN-MRC',
        passengerCapacity: 12,
        cargoCapacityKg: 1400,
        serviceabilityStatus: 'UNSERVICEABLE',
        currentStationId: 'st-djj',
        serviceabilityNote:
          'Rework package shows failed inspection, corrective work, and passed re-inspection.'
      }
    ] as const) {
      insertIgnore(sqlite, 'aircraft', {
        ...aircraftRecord,
        fuelType: 'AVTUR',
        engineCategory: 'TURBINE',
        usableFuelCapacityLitre: 1257,
        fuelCapacityBasis: 'USABLE',
        cruiseFuelBurnLitrePerHour: 180,
        holdingFuelBurnLitrePerHour: 180,
        taxiFuelBurnLitrePerHour: 120,
        fuelProfileSource: 'HISTORICAL_ESTIMATE',
        fuelProfileReference: 'Advisory planning profile; validate against AMA AFM/POH records',
        fuelProfileEffectiveFrom: '2026-01-01',
        fuelProfileAdvisoryOnly: 1,
        operationalStatus: 'ACTIVE',
        baseStationId: 'st-djj',
        lastMaintenanceCheckAt: context.date(-12),
        nextMaintenanceDueAt: context.date(45),
        airframeHours: 4120,
        airframeCycles: 2090,
        version: 1,
        isActive: 1,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    insertIgnore(sqlite, 'aircraft_defects', {
      id: 'adefect-mrov1-release',
      aircraftId: 'ac-pk-mra',
      defectNumber: 'DEF-MROV1-MRA-001',
      title: 'Starter-generator abnormal indication',
      description:
        'Pilot technical log reports starter-generator abnormal indication after shutdown; defect requires controlled rectification and release.',
      detectedAt: context.at(-1, '10:10'),
      detectedByUserId: 'USR-001',
      sourceReference: 'TECHLOG-MROV1-MRA-001',
      evidenceReferences: JSON.stringify(['TECHLOG-MROV1-MRA-001']),
      status: 'OPEN',
      createdAt: seedNow,
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'aircraft_defects', {
      id: 'adefect-mrov1-selector',
      aircraftId: 'ac-pk-mrb',
      defectNumber: 'DEF-MROV1-MRB-001',
      title: 'Brake wear indication',
      description:
        'Pilot technical log reports brake wear indication for contextual package creation.',
      detectedAt: context.at(-1, '12:25'),
      detectedByUserId: 'USR-001',
      sourceReference: 'TECHLOG-MROV1-MRB-001',
      evidenceReferences: JSON.stringify(['TECHLOG-MROV1-MRB-001']),
      status: 'OPEN',
      createdAt: seedNow,
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'aircraft_defects', {
      id: 'adefect-mrov1-rework',
      aircraftId: 'ac-pk-mrc',
      defectNumber: 'DEF-MROV1-MRC-001',
      title: 'Landing light intermittent operation',
      description:
        'Technical log reports intermittent landing light operation requiring rectification and independent inspection.',
      detectedAt: context.at(-1, '12:40'),
      detectedByUserId: 'USR-001',
      sourceReference: 'TECHLOG-MROV1-MRC-001',
      evidenceReferences: JSON.stringify(['TECHLOG-MROV1-MRC-001']),
      status: 'OPEN',
      createdAt: seedNow,
      updatedAt: seedNow
    });

    for (const assessment of [
      {
        id: 'massess-mrov1-amc-active',
        defectId: 'adefect-pk-amc-open',
        aircraftId: 'ac-pk-amc',
        assessmentDecision: 'GROUND',
        assessmentNote:
          'Ground aircraft until the engine indication anomaly is rectified and independently inspected.'
      },
      {
        id: 'massess-mrov1-mra-release',
        defectId: 'adefect-mrov1-release',
        aircraftId: 'ac-pk-mra',
        assessmentDecision: 'GROUND',
        assessmentNote:
          'Ground aircraft until starter-generator indication rectification is technically released.'
      },
      {
        id: 'massess-mrov1-mrb-selector',
        defectId: 'adefect-mrov1-selector',
        aircraftId: 'ac-pk-mrb',
        assessmentDecision: 'GROUND',
        assessmentNote:
          'Ground aircraft until brake wear finding is planned into an MRO work package.'
      },
      {
        id: 'massess-mrov1-mrc-rework',
        defectId: 'adefect-mrov1-rework',
        aircraftId: 'ac-pk-mrc',
        assessmentDecision: 'GROUND',
        assessmentNote:
          'Ground aircraft until landing light rectification and re-inspection are complete.'
      }
    ] as const) {
      insertIgnore(sqlite, 'maintenance_defect_assessments', {
        ...assessment,
        assessedByUserId: 'USR-MAINTENANCE-MANAGER',
        assessedAt: context.at(-1, '13:00'),
        requestId: 'seed-mrov1'
      });
    }

    insertIgnore(sqlite, 'maintenance_work_packages', {
      id: 'mwp-mrov1-active',
      packageNumber: 'MWP-MROV1-ACTIVE',
      aircraftId: 'ac-pk-amc',
      sourceFlightId: null,
      primaryDefectId: 'adefect-pk-amc-open',
      title: 'Engine indication troubleshooting and rectification',
      priority: 'HIGH',
      executionMode: 'INTERNAL',
      vendorId: null,
      status: 'IN_PROGRESS',
      planningNote:
        'Active package awaiting independent inspection. Failed inspection rework is intentionally disabled for MRO Foundation v1.',
      financialStatus: 'NOT_READY',
      version: 3,
      createdByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '13:10'),
      updatedAt: context.at(-1, '14:35')
    });

    insertIgnore(sqlite, 'maintenance_work_packages', {
      id: 'mwp-mrov1-release-ready',
      packageNumber: 'MWP-MROV1-RTS',
      aircraftId: 'ac-pk-mra',
      sourceFlightId: null,
      primaryDefectId: 'adefect-mrov1-release',
      title: 'Starter-generator indication rectification',
      priority: 'HIGH',
      executionMode: 'INTERNAL',
      vendorId: null,
      status: 'READY_FOR_RELEASE',
      planningNote:
        'Golden-path package. Technical release must be issued by Certifying Staff using AME-CERT-MRO-001.',
      financialStatus: 'NOT_READY',
      version: 4,
      createdByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '13:20'),
      updatedAt: context.at(-1, '15:45')
    });

    insertIgnore(sqlite, 'maintenance_work_packages', {
      id: 'mwp-mrov1-rework',
      packageNumber: 'MWP-MROV1-REWORK',
      aircraftId: 'ac-pk-mrc',
      sourceFlightId: null,
      primaryDefectId: 'adefect-mrov1-rework',
      title: 'Landing light intermittent operation rectification',
      priority: 'NORMAL',
      executionMode: 'INTERNAL',
      vendorId: null,
      status: 'READY_FOR_RELEASE',
      planningNote:
        'Rework package with failed inspection, corrective work, and passed re-inspection.',
      financialStatus: 'NOT_READY',
      version: 6,
      createdByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '13:30'),
      updatedAt: context.at(-1, '16:30')
    });

    insertIgnore(sqlite, 'aircraft_maintenance_releases', {
      id: 'arelease-mrov1-history',
      aircraftId: 'ac-pk-ama',
      releaseNumber: 'RTS-MROV1-HIST-001',
      resultingStatus: 'SERVICEABLE',
      workOrderReference: 'MWP-MROV1-HIST',
      releaseStatement: 'Aircraft technically released after historical maintenance-record review.',
      certifyingUserId: 'USR-CERTIFYING-STAFF',
      certifyingLicenseNumber: 'AME-CERT-MRO-001',
      releasedAt: context.at(-1, '11:40'),
      evidenceReferences: JSON.stringify(['MROV1-HIST-RELEASE-PACK']),
      defectIds: JSON.stringify([]),
      signerAuthorizationSnapshotJson: snapshot(context, 'ac-pk-ama', 'PK-AMA', 'Pilatus PC-6'),
      createdAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_work_packages', {
      id: 'mwp-mrov1-history',
      packageNumber: 'MWP-MROV1-HIST',
      aircraftId: 'ac-pk-ama',
      sourceFlightId: null,
      primaryDefectId: null,
      title: 'Historical technical release package',
      priority: 'NORMAL',
      executionMode: 'INTERNAL',
      vendorId: null,
      status: 'RELEASED',
      planningNote: 'Historical signed technical-release record with licence-validation snapshot.',
      releaseId: 'arelease-mrov1-history',
      releasedAt: context.at(-1, '11:40'),
      financialStatus: 'READY_FOR_HANDOFF',
      version: 5,
      createdByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '09:50'),
      updatedAt: context.at(-1, '11:40')
    });

    for (const card of [
      {
        id: 'mjc-mrov1-active-001',
        workPackageId: 'mwp-mrov1-active',
        cardNumber: 'MWP-MROV1-ACTIVE-JC-001',
        title: 'Troubleshoot engine indication wiring and sensor reference',
        taskType: 'DEFECT_RECTIFICATION',
        maintenanceDataRef: 'AMM PAC750XL 77-30-00',
        maintenanceDataRevision: 'REV-MROV1-2026-08',
        mandatoryFlag: 1,
        requiresIndependentInspection: 1,
        status: 'INSPECTION_REQUIRED',
        version: 2,
        createdByUserId: 'USR-MAINTENANCE-MANAGER',
        createdAt: context.at(-1, '13:15'),
        updatedAt: context.at(-1, '14:35')
      },
      {
        id: 'mjc-mrov1-release-001',
        workPackageId: 'mwp-mrov1-release-ready',
        cardNumber: 'MWP-MROV1-RTS-JC-001',
        title: 'Rectify starter-generator indication wiring',
        taskType: 'DEFECT_RECTIFICATION',
        maintenanceDataRef: 'AMM C208B 24-30-00',
        maintenanceDataRevision: 'REV-MROV1-2026-08',
        mandatoryFlag: 1,
        requiresIndependentInspection: 1,
        status: 'READY_FOR_RELEASE_REVIEW',
        version: 3,
        createdByUserId: 'USR-MAINTENANCE-MANAGER',
        createdAt: context.at(-1, '13:25'),
        updatedAt: context.at(-1, '15:45')
      },
      {
        id: 'mjc-mrov1-rework-001',
        workPackageId: 'mwp-mrov1-rework',
        cardNumber: 'MWP-MROV1-REWORK-JC-001',
        title: 'Rectify landing light intermittent circuit',
        taskType: 'DEFECT_RECTIFICATION',
        maintenanceDataRef: 'PTAMA-C208B-ELECT-33-40-MROV1',
        maintenanceDataRevision: 'REV-MROV1-2026-08',
        mandatoryFlag: 1,
        requiresIndependentInspection: 1,
        status: 'READY_FOR_RELEASE_REVIEW',
        version: 5,
        createdByUserId: 'USR-MAINTENANCE-MANAGER',
        createdAt: context.at(-1, '13:35'),
        updatedAt: context.at(-1, '16:30')
      },
      {
        id: 'mjc-mrov1-history-001',
        workPackageId: 'mwp-mrov1-history',
        cardNumber: 'MWP-MROV1-HIST-JC-001',
        title: 'Historical maintenance record review',
        taskType: 'SCHEDULED_TASK',
        maintenanceDataRef: 'AMP PC6 MROV1 05-20-00',
        maintenanceDataRevision: 'REV-MROV1-2026-08',
        mandatoryFlag: 1,
        requiresIndependentInspection: 0,
        status: 'READY_FOR_RELEASE_REVIEW',
        version: 3,
        createdByUserId: 'USR-MAINTENANCE-MANAGER',
        createdAt: context.at(-1, '10:00'),
        updatedAt: context.at(-1, '11:25')
      }
    ] as const) {
      insertIgnore(sqlite, 'maintenance_job_cards', card);
    }

    for (const signoff of [
      {
        id: 'msign-mrov1-active-mech',
        jobCardId: 'mjc-mrov1-active-001',
        signoffType: 'MECHANIC',
        decision: 'COMPLETED',
        statement:
          'Troubleshooting and corrective action completed; independent inspection is required before release review.',
        evidenceReferences: JSON.stringify(['JC-ACTIVE-MECH-EVIDENCE']),
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        signedAt: context.at(-1, '14:35'),
        requestId: 'seed-mrov1'
      },
      {
        id: 'msign-mrov1-release-mech',
        jobCardId: 'mjc-mrov1-release-001',
        signoffType: 'MECHANIC',
        decision: 'COMPLETED',
        statement:
          'Starter-generator indication rectification completed in accordance with referenced approved data.',
        evidenceReferences: JSON.stringify(['JC-RTS-MECH-EVIDENCE']),
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        signedAt: context.at(-1, '15:05'),
        requestId: 'seed-mrov1'
      },
      {
        id: 'msign-mrov1-release-insp',
        jobCardId: 'mjc-mrov1-release-001',
        signoffType: 'INDEPENDENT_INSPECTION',
        decision: 'PASSED',
        statement:
          'Independent inspection passed; original mechanic did not perform this inspection.',
        evidenceReferences: JSON.stringify(['JC-RTS-INSP-EVIDENCE']),
        actorUserId: 'USR-CERTIFYING-STAFF',
        actorRole: 'Certifying Staff',
        signedAt: context.at(-1, '15:45'),
        requestId: 'seed-mrov1'
      },
      {
        id: 'msign-mrov1-rework-mech',
        jobCardId: 'mjc-mrov1-rework-001',
        signoffType: 'MECHANIC',
        decision: 'COMPLETED',
        statement:
          'Landing light circuit rectification completed in accordance with referenced MROV1 approved data.',
        evidenceReferences: JSON.stringify(['JC-REWORK-MECH-EVIDENCE']),
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        signedAt: context.at(-1, '14:15'),
        requestId: 'seed-mrov1'
      },
      {
        id: 'msign-mrov1-rework-insp',
        jobCardId: 'mjc-mrov1-rework-001',
        signoffType: 'INDEPENDENT_INSPECTION',
        decision: 'PASSED',
        statement:
          'Re-inspection passed after corrective work; landing light operation checked satisfactory.',
        evidenceReferences: JSON.stringify(['JC-REWORK-REINSP-EVIDENCE']),
        actorUserId: 'USR-CERTIFYING-STAFF',
        actorRole: 'Certifying Staff',
        signedAt: context.at(-1, '16:30'),
        requestId: 'seed-mrov1'
      },
      {
        id: 'msign-mrov1-history-mech',
        jobCardId: 'mjc-mrov1-history-001',
        signoffType: 'MECHANIC',
        decision: 'COMPLETED',
        statement: 'Historical package record review completed.',
        evidenceReferences: JSON.stringify(['JC-HIST-MECH-EVIDENCE']),
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        signedAt: context.at(-1, '11:25'),
        requestId: 'seed-mrov1'
      }
    ] as const) {
      insertIgnore(sqlite, 'maintenance_job_card_signoffs', signoff);
    }

    for (const attempt of [
      {
        id: 'minsp-mrov1-rework-failed',
        jobCardId: 'mjc-mrov1-rework-001',
        workPackageId: 'mwp-mrov1-rework',
        attemptNumber: 1,
        cycleNumber: 1,
        result: 'FAILED',
        finding:
          'Inspection found landing light operation still intermittent after initial rectification.',
        inspectorUserId: 'USR-CERTIFYING-STAFF',
        inspectorRole: 'Certifying Staff',
        inspectorLicenseNumber: 'AME-CERT-MRO-001',
        inspectorLicenseSnapshotJson: snapshot(
          context,
          'ac-pk-mrc',
          'PK-MRC',
          'Cessna Caravan 208B'
        ),
        packageVersion: 3,
        inspectedAt: context.at(-1, '14:45'),
        idempotencyKey: 'seed-mrov1-rework-failed-inspection',
        requestId: 'seed-mrov1',
        createdAt: context.at(-1, '14:45')
      },
      {
        id: 'minsp-mrov1-rework-passed',
        jobCardId: 'mjc-mrov1-rework-001',
        workPackageId: 'mwp-mrov1-rework',
        attemptNumber: 2,
        cycleNumber: 1,
        result: 'PASSED',
        finding:
          'Re-inspection passed after corrective work; landing light operation is satisfactory.',
        inspectorUserId: 'USR-CERTIFYING-STAFF',
        inspectorRole: 'Certifying Staff',
        inspectorLicenseNumber: 'AME-CERT-MRO-001',
        inspectorLicenseSnapshotJson: snapshot(
          context,
          'ac-pk-mrc',
          'PK-MRC',
          'Cessna Caravan 208B'
        ),
        packageVersion: 5,
        inspectedAt: context.at(-1, '16:30'),
        idempotencyKey: 'seed-mrov1-rework-passed-reinspection',
        requestId: 'seed-mrov1',
        createdAt: context.at(-1, '16:30')
      }
    ] as const) {
      insertIgnore(sqlite, 'maintenance_inspection_attempts', attempt);
    }

    insertIgnore(sqlite, 'maintenance_rework_actions', {
      id: 'mrework-mrov1-cycle-001',
      reworkNumber: 'MWP-MROV1-REWORK-RWK-01',
      workPackageId: 'mwp-mrov1-rework',
      jobCardId: 'mjc-mrov1-rework-001',
      sourceInspectionAttemptId: 'minsp-mrov1-rework-failed',
      cycleNumber: 1,
      finding:
        'Inspection found landing light operation still intermittent after initial rectification.',
      correctiveActionDescription:
        'Corrected terminal seating and performed operational check using PT AMA MROV1 approved-data package.',
      approvedDataRef: 'PTAMA-C208B-ELECT-33-40-MROV1 REV A',
      assignedMechanicUserId: 'USR-MAINTENANCE-MANAGER',
      status: 'REINSPECTION_PASSED',
      mechanicSignoffStatement:
        'Corrective work completed and landing light operation checked prior to re-inspection.',
      mechanicSignoffUserId: 'USR-MAINTENANCE-MANAGER',
      mechanicSignoffRole: 'Maintenance Manager',
      mechanicSignoffAt: context.at(-1, '16:05'),
      reinspectionAttemptId: 'minsp-mrov1-rework-passed',
      requestId: 'seed-mrov1',
      createdAt: context.at(-1, '14:45'),
      updatedAt: context.at(-1, '16:30')
    });

    for (const record of [
      {
        id: 'maudit-mrov1-active-sign',
        entityType: 'JOB_CARD',
        entityId: 'mjc-mrov1-active-001',
        action: 'MECHANIC_SIGNOFF',
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '14:35'),
        metadataJson: JSON.stringify({
          seed: 'MRO_UI_ALIGNMENT',
          packageNumber: 'MWP-MROV1-ACTIVE',
          cardNumber: 'MWP-MROV1-ACTIVE-JC-001'
        })
      },
      {
        id: 'maudit-mrov1-release-defect-assess',
        entityType: 'DEFECT',
        entityId: 'adefect-mrov1-release',
        action: 'ASSESS',
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '13:05'),
        metadataJson: JSON.stringify({
          seed: 'MRO_UI_ALIGNMENT',
          packageNumber: 'MWP-MROV1-RTS',
          defectNumber: 'DEF-MROV1-MRA-001'
        })
      },
      {
        id: 'maudit-mrov1-release-package-create',
        entityType: 'WORK_PACKAGE',
        entityId: 'mwp-mrov1-release-ready',
        action: 'CREATE',
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '13:20'),
        metadataJson: JSON.stringify({
          seed: 'MRO_UI_ALIGNMENT',
          packageNumber: 'MWP-MROV1-RTS',
          defectNumber: 'DEF-MROV1-MRA-001'
        })
      },
      {
        id: 'maudit-mrov1-release-job-start',
        entityType: 'JOB_CARD',
        entityId: 'mjc-mrov1-release-001',
        action: 'START',
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '14:20'),
        metadataJson: JSON.stringify({
          seed: 'MRO_UI_ALIGNMENT',
          packageNumber: 'MWP-MROV1-RTS',
          cardNumber: 'MWP-MROV1-RTS-JC-001'
        })
      },
      {
        id: 'maudit-mrov1-release-job-sign',
        entityType: 'JOB_CARD',
        entityId: 'mjc-mrov1-release-001',
        action: 'MECHANIC_SIGNOFF',
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '15:05'),
        metadataJson: JSON.stringify({
          seed: 'MRO_UI_ALIGNMENT',
          packageNumber: 'MWP-MROV1-RTS',
          cardNumber: 'MWP-MROV1-RTS-JC-001'
        })
      },
      {
        id: 'maudit-mrov1-release-inspection',
        entityType: 'JOB_CARD',
        entityId: 'mjc-mrov1-release-001',
        action: 'INDEPENDENT_INSPECTION_PASSED',
        actorUserId: 'USR-CERTIFYING-STAFF',
        actorRole: 'Certifying Staff',
        occurredAt: context.at(-1, '15:45'),
        metadataJson: JSON.stringify({
          seed: 'MRO_UI_ALIGNMENT',
          packageNumber: 'MWP-MROV1-RTS',
          cardNumber: 'MWP-MROV1-RTS-JC-001'
        })
      },
      {
        id: 'maudit-mrov1-release-ready',
        entityType: 'WORK_PACKAGE',
        entityId: 'mwp-mrov1-release-ready',
        action: 'REQUEST_RELEASE',
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '15:45'),
        metadataJson: JSON.stringify({
          seed: 'MRO_UI_ALIGNMENT',
          authorizationNotice,
          packageNumber: 'MWP-MROV1-RTS'
        })
      },
      {
        id: 'maudit-mrov1-rework-defect-assess',
        entityType: 'DEFECT',
        entityId: 'adefect-mrov1-rework',
        action: 'ASSESS',
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '13:05'),
        metadataJson: JSON.stringify({
          seed: 'MRO_REWORK_V1',
          packageNumber: 'MWP-MROV1-REWORK',
          defectNumber: 'DEF-MROV1-MRC-001'
        })
      },
      {
        id: 'maudit-mrov1-rework-package-create',
        entityType: 'WORK_PACKAGE',
        entityId: 'mwp-mrov1-rework',
        action: 'CREATE',
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '13:30'),
        metadataJson: JSON.stringify({
          seed: 'MRO_REWORK_V1',
          packageNumber: 'MWP-MROV1-REWORK',
          defectNumber: 'DEF-MROV1-MRC-001'
        })
      },
      {
        id: 'maudit-mrov1-rework-failed-inspection',
        entityType: 'INSPECTION_ATTEMPT',
        entityId: 'minsp-mrov1-rework-failed',
        action: 'INDEPENDENT_INSPECTION_FAILED',
        actorUserId: 'USR-CERTIFYING-STAFF',
        actorRole: 'Certifying Staff',
        occurredAt: context.at(-1, '14:45'),
        metadataJson: JSON.stringify({
          seed: 'MRO_REWORK_V1',
          packageNumber: 'MWP-MROV1-REWORK',
          cardNumber: 'MWP-MROV1-REWORK-JC-001',
          reworkNumber: 'MWP-MROV1-REWORK-RWK-01'
        })
      },
      {
        id: 'maudit-mrov1-rework-required',
        entityType: 'REWORK_ACTION',
        entityId: 'mrework-mrov1-cycle-001',
        action: 'REWORK_REQUIRED',
        actorUserId: 'USR-CERTIFYING-STAFF',
        actorRole: 'Certifying Staff',
        occurredAt: context.at(-1, '14:45'),
        metadataJson: JSON.stringify({
          seed: 'MRO_REWORK_V1',
          packageNumber: 'MWP-MROV1-REWORK',
          cardNumber: 'MWP-MROV1-REWORK-JC-001'
        })
      },
      {
        id: 'maudit-mrov1-rework-corrective-sign',
        entityType: 'REWORK_ACTION',
        entityId: 'mrework-mrov1-cycle-001',
        action: 'CORRECTIVE_WORK_SIGNED',
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '16:05'),
        metadataJson: JSON.stringify({
          seed: 'MRO_REWORK_V1',
          packageNumber: 'MWP-MROV1-REWORK',
          approvedDataRef: 'PTAMA-C208B-ELECT-33-40-MROV1 REV A'
        })
      },
      {
        id: 'maudit-mrov1-rework-passed-reinspection',
        entityType: 'INSPECTION_ATTEMPT',
        entityId: 'minsp-mrov1-rework-passed',
        action: 'INDEPENDENT_INSPECTION_PASSED',
        actorUserId: 'USR-CERTIFYING-STAFF',
        actorRole: 'Certifying Staff',
        occurredAt: context.at(-1, '16:30'),
        metadataJson: JSON.stringify({
          seed: 'MRO_REWORK_V1',
          packageNumber: 'MWP-MROV1-REWORK',
          cardNumber: 'MWP-MROV1-REWORK-JC-001',
          reworkNumber: 'MWP-MROV1-REWORK-RWK-01'
        })
      },
      {
        id: 'maudit-mrov1-rework-ready',
        entityType: 'WORK_PACKAGE',
        entityId: 'mwp-mrov1-rework',
        action: 'REQUEST_RELEASE',
        actorUserId: 'USR-MAINTENANCE-MANAGER',
        actorRole: 'Maintenance Manager',
        occurredAt: context.at(-1, '16:30'),
        metadataJson: JSON.stringify({
          seed: 'MRO_REWORK_V1',
          authorizationNotice,
          packageNumber: 'MWP-MROV1-REWORK'
        })
      },
      {
        id: 'maudit-mrov1-history-release',
        entityType: 'WORK_PACKAGE',
        entityId: 'mwp-mrov1-history',
        action: 'TECHNICAL_RELEASE',
        actorUserId: 'USR-CERTIFYING-STAFF',
        actorRole: 'Certifying Staff',
        occurredAt: context.at(-1, '11:40'),
        metadataJson: JSON.stringify({
          seed: 'MRO_UI_ALIGNMENT',
          authorizationNotice,
          packageNumber: 'MWP-MROV1-HIST'
        })
      }
    ] as const) {
      insertIgnore(sqlite, 'maintenance_audit_logs', {
        id: record.id,
        entityType: record.entityType,
        entityId: record.entityId,
        action: record.action,
        actorUserId: record.actorUserId,
        actorRole: record.actorRole,
        requestId: 'seed-mrov1',
        beforeVersion: null,
        afterVersion: null,
        metadataJson: record.metadataJson,
        occurredAt: record.occurredAt
      });
    }

    for (const [id, aircraftId, reason, sourceId] of [
      [
        'ahist-mrov1-mra-ground',
        'ac-pk-mra',
        'MRO Foundation v1 defect opened for release-ready package.',
        'adefect-mrov1-release'
      ],
      [
        'ahist-mrov1-mrb-ground',
        'ac-pk-mrb',
        'MRO Foundation v1 defect opened for contextual creation selector.',
        'adefect-mrov1-selector'
      ],
      [
        'ahist-mrov1-mrc-ground',
        'ac-pk-mrc',
        'MRO Foundation v1 defect opened for failed-inspection rework scenario.',
        'adefect-mrov1-rework'
      ]
    ] as const) {
      insertIgnore(sqlite, 'aircraft_status_history', {
        id,
        aircraftId,
        statusDimension: 'TECHNICAL',
        fromStatus: 'SERVICEABLE',
        toStatus: 'UNSERVICEABLE',
        reason,
        sourceType: 'AIRCRAFT_DEFECT',
        sourceId,
        actorUserId: 'SYSTEM_SEED',
        actorRole: 'SYSTEM',
        occurredAt: context.at(-1, '13:00'),
        metadata: JSON.stringify({ seed: 'MRO_UI_ALIGNMENT' })
      });
    }
  });

  seed.immediate();
}
