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

export function seedMroV21Foundation(sqlite: Database.Database, context: DemoSeedContext) {
  const seedNow = context.now;
  const seed = sqlite.transaction(() => {
    // ============================================================================
    // DEFECTS FOR V2.1 SCENARIOS
    // Create unique defects for Demo-v2.1 work packages to avoid conflicts
    // ============================================================================

    insertIgnore(sqlite, 'aircraft_defects', {
      id: 'adefect-mrov21-conflict',
      aircraftId: 'ac-pk-mrb',
      defectNumber: 'DEF-MROV21-CONFLICT-001',
      title: 'Brake wear indicator anomaly',
      description: 'Brake wear indicator shows inconsistent readings during pre-flight inspection',
      detectedAt: seedNow,
      detectedByUserId: 'USR-MAINTENANCE-TECH',
      sourceReference: 'PREFLIGHT-2024-001',
      status: 'OPEN',
      createdAt: seedNow,
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'aircraft_defects', {
      id: 'adefect-mrov21-expired-auth',
      aircraftId: 'ac-pk-mrc',
      defectNumber: 'DEF-MROV21-EXPIRED-001',
      title: 'Electrical system intermittent fault',
      description: 'Intermittent electrical fault detected in avionics bay',
      detectedAt: seedNow,
      detectedByUserId: 'USR-MAINTENANCE-TECH',
      sourceReference: 'PREFLIGHT-2024-002',
      status: 'OPEN',
      createdAt: seedNow,
      updatedAt: seedNow
    });

    // ============================================================================
    // AMO ORGANIZATIONS
    // ============================================================================

    insertIgnore(sqlite, 'maintenance_amo_organizations', {
      id: 'amo-mantiq-internal',
      organizationCode: 'AMA-INTERNAL-001',
      organizationName: 'PT Mantiq Aero Maintenance',
      organizationType: 'INTERNAL_AMO',
      approvalReference: 'DGCA-AMO-2024-001',
      approvalDocumentId: null,
      approvalAuthority: 'Directorate General of Civil Aviation',
      validFrom: context.date(-365),
      validUntil: context.date(730),
      status: 'ACTIVE',
      fictionalDemo: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_amo_organizations', {
      id: 'amo-skytech-contracted',
      organizationCode: 'SKYTECH-MRO-001',
      organizationName: 'SkyTech MRO Services',
      organizationType: 'CONTRACTED_AMO',
      approvalReference: 'DGCA-AMO-2024-042',
      approvalDocumentId: null,
      approvalAuthority: 'Directorate General of Civil Aviation',
      validFrom: context.date(-180),
      validUntil: context.date(545),
      status: 'ACTIVE',
      fictionalDemo: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_amo_organizations', {
      id: 'amo-expired-vendor',
      organizationCode: 'EXPIRED-VENDOR-001',
      organizationName: 'Legacy Maintenance Services',
      organizationType: 'VENDOR',
      approvalReference: 'DGCA-AMO-2022-099',
      approvalDocumentId: null,
      approvalAuthority: 'Directorate General of Civil Aviation',
      validFrom: context.date(-730),
      validUntil: context.date(-30),
      status: 'EXPIRED',
      fictionalDemo: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    // ============================================================================
    // AMO SCOPES
    // ============================================================================

    // PT Mantiq Aero Maintenance - Internal scopes
    insertIgnore(sqlite, 'maintenance_amo_scopes', {
      id: 'amo-scope-mantiq-atri72',
      amoOrganizationId: 'amo-mantiq-internal',
      aircraftType: 'ATR 72-600',
      aircraftRegistration: null,
      maintenanceAction: 'LINE_MAINTENANCE',
      rating: 'AIRFRAME',
      limitation: null,
      stationId: 'st-djj',
      validFrom: context.date(-365),
      validUntil: context.date(730),
      approvalDocumentId: null,
      status: 'ACTIVE',
      fictionalDemo: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_amo_scopes', {
      id: 'amo-scope-mantiq-c208b',
      amoOrganizationId: 'amo-mantiq-internal',
      aircraftType: 'Cessna 208B',
      aircraftRegistration: null,
      maintenanceAction: 'LINE_MAINTENANCE',
      rating: 'AIRFRAME',
      limitation: null,
      stationId: 'st-djj',
      validFrom: context.date(-365),
      validUntil: context.date(730),
      approvalDocumentId: null,
      status: 'ACTIVE',
      fictionalDemo: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_amo_scopes', {
      id: 'amo-scope-mantiq-pc6',
      amoOrganizationId: 'amo-mantiq-internal',
      aircraftType: 'Pilatus PC-6',
      aircraftRegistration: null,
      maintenanceAction: 'BASE_MAINTENANCE',
      rating: 'AIRFRAME',
      limitation: null,
      stationId: 'st-djj',
      validFrom: context.date(-365),
      validUntil: context.date(730),
      approvalDocumentId: null,
      status: 'ACTIVE',
      fictionalDemo: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    // SkyTech MRO Services - Contracted scopes
    insertIgnore(sqlite, 'maintenance_amo_scopes', {
      id: 'amo-scope-skytech-atri72',
      amoOrganizationId: 'amo-skytech-contracted',
      aircraftType: 'ATR 72-600',
      aircraftRegistration: null,
      maintenanceAction: 'BASE_MAINTENANCE',
      rating: 'AIRFRAME',
      limitation: 'Heavy maintenance checks only',
      stationId: null,
      validFrom: context.date(-180),
      validUntil: context.date(545),
      approvalDocumentId: null,
      status: 'ACTIVE',
      fictionalDemo: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_amo_scopes', {
      id: 'amo-scope-skytech-engine',
      amoOrganizationId: 'amo-skytech-contracted',
      aircraftType: 'ATR 72-600',
      aircraftRegistration: null,
      maintenanceAction: 'ENGINE_OVERHAUL',
      rating: 'POWERPLANT',
      limitation: null,
      stationId: null,
      validFrom: context.date(-180),
      validUntil: context.date(545),
      approvalDocumentId: null,
      status: 'ACTIVE',
      fictionalDemo: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    // ============================================================================
    // SCENARIO A: FULLY READY PACKAGE
    // Work package mwp-mrov1-release-ready with all resources declared REQUIRED
    // ============================================================================

    // Resource planning declarations for release-ready package
    insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
      id: 'decl-release-material',
      workPackageId: 'mwp-mrov1-release-ready',
      resourceType: 'MATERIAL',
      declaration: 'REQUIRED',
      reason: null,
      evidenceDocumentId: null,
      declaredBy: 'USR-MAINTENANCE-MANAGER',
      declaredAt: context.at(-1, '13:25'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
      id: 'decl-release-tool',
      workPackageId: 'mwp-mrov1-release-ready',
      resourceType: 'TOOL',
      declaration: 'REQUIRED',
      reason: null,
      evidenceDocumentId: null,
      declaredBy: 'USR-MAINTENANCE-MANAGER',
      declaredAt: context.at(-1, '13:25'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
      id: 'decl-release-personnel',
      workPackageId: 'mwp-mrov1-release-ready',
      resourceType: 'PERSONNEL',
      declaration: 'REQUIRED',
      reason: null,
      evidenceDocumentId: null,
      declaredBy: 'USR-MAINTENANCE-MANAGER',
      declaredAt: context.at(-1, '13:25'),
      updatedAt: seedNow
    });

    // Tool requirements for release-ready package (using calibrated tool)
    insertIgnore(sqlite, 'maintenance_tool_requirements', {
      id: 'tool-req-release-001',
      workPackageId: 'mwp-mrov1-release-ready',
      jobCardId: 'mjc-mrov1-release-001',
      toolMasterId: 'mtool-mrov2-calibrated',
      toolType: 'TEST_EQUIPMENT',
      quantity: 1,
      requiredStationId: 'st-djj',
      requiredFrom: context.at(-1, '14:00'),
      requiredUntil: context.at(0, '18:00'),
      status: 'ALLOCATED',
      createdBy: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '13:30'),
      updatedAt: seedNow
    });

    // Personnel requirements for release-ready package
    insertIgnore(sqlite, 'maintenance_personnel_requirements', {
      id: 'personnel-req-release-mechanic',
      workPackageId: 'mwp-mrov1-release-ready',
      jobCardId: 'mjc-mrov1-release-001',
      roleType: 'MECHANIC',
      requiredCount: 1,
      requiredLicenceType: 'AMEL',
      requiredQualification: 'Cessna Caravan 208B',
      requiredAuthorization: 'MECHANIC_SIGN_OFF',
      aircraftType: 'Cessna Caravan 208B',
      dutyStationId: 'st-djj',
      requiredFrom: context.at(-1, '14:00'),
      requiredUntil: context.at(0, '18:00'),
      status: 'FULFILLED',
      createdBy: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '13:30'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_personnel_requirements', {
      id: 'personnel-req-release-inspector',
      workPackageId: 'mwp-mrov1-release-ready',
      jobCardId: 'mjc-mrov1-release-001',
      roleType: 'INSPECTOR',
      requiredCount: 1,
      requiredLicenceType: 'AMEL',
      requiredQualification: 'Cessna Caravan 208B',
      requiredAuthorization: 'INDEPENDENT_INSPECTION',
      aircraftType: 'Cessna Caravan 208B',
      dutyStationId: 'st-djj',
      requiredFrom: context.at(-1, '15:00'),
      requiredUntil: context.at(0, '18:00'),
      status: 'FULFILLED',
      createdBy: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '13:30'),
      updatedAt: seedNow
    });

    // Personnel assignments for release-ready package
    insertIgnore(sqlite, 'maintenance_personnel_assignments', {
      id: 'assign-release-mechanic',
      personnelRequirementId: 'personnel-req-release-mechanic',
      personnelId: 'crew-maintenance-manager',
      workPackageId: 'mwp-mrov1-release-ready',
      jobCardId: 'mjc-mrov1-release-001',
      roleType: 'MECHANIC',
      status: 'CONFIRMED',
      eligibilityStatus: 'ELIGIBLE',
      eligibilitySnapshotJson: JSON.stringify({
        licenceValid: true,
        qualificationValid: true,
        authorizationValid: true,
        evaluatedAt: context.at(-1, '13:35')
      }),
      assignedBy: 'USR-MAINTENANCE-MANAGER',
      assignedAt: context.at(-1, '13:35'),
      confirmedAt: context.at(-1, '13:40'),
      releasedAt: null,
      createdAt: context.at(-1, '13:35'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_personnel_assignments', {
      id: 'assign-release-inspector',
      personnelRequirementId: 'personnel-req-release-inspector',
      personnelId: 'crew-certifying-staff',
      workPackageId: 'mwp-mrov1-release-ready',
      jobCardId: 'mjc-mrov1-release-001',
      roleType: 'INSPECTOR',
      status: 'CONFIRMED',
      eligibilityStatus: 'ELIGIBLE',
      eligibilitySnapshotJson: JSON.stringify({
        licenceValid: true,
        qualificationValid: true,
        authorizationValid: true,
        evaluatedAt: context.at(-1, '13:35')
      }),
      assignedBy: 'USR-MAINTENANCE-MANAGER',
      assignedAt: context.at(-1, '13:35'),
      confirmedAt: context.at(-1, '13:40'),
      releasedAt: null,
      createdAt: context.at(-1, '13:35'),
      updatedAt: seedNow
    });

    // ============================================================================
    // SCENARIO B: DOUBLE RESERVATION CONFLICT
    // Two work packages needing the same limited inventory part
    // ============================================================================

    // Create a second work package for conflict scenario
    insertIgnore(sqlite, 'maintenance_work_packages', {
      id: 'mwp-mrov21-conflict',
      packageNumber: 'MWP-MROV21-CONFLICT',
      aircraftId: 'ac-pk-mrb',
      sourceFlightId: null,
      primaryDefectId: 'adefect-mrov21-conflict',
      title: 'Brake system inspection and replacement',
      priority: 'HIGH',
      executionMode: 'INTERNAL',
      vendorId: null,
      status: 'OPEN',
      planningNote:
        'Scenario B: Competing for same inventory part as release-ready package. Should be blocked on reservation.',
      financialStatus: 'NOT_READY',
      version: 1,
      createdByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '14:00'),
      updatedAt: seedNow
    });

    // Resource declarations for conflict package
    insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
      id: 'decl-conflict-material',
      workPackageId: 'mwp-mrov21-conflict',
      resourceType: 'MATERIAL',
      declaration: 'REQUIRED',
      reason: null,
      evidenceDocumentId: null,
      declaredBy: 'USR-MAINTENANCE-MANAGER',
      declaredAt: context.at(-1, '14:05'),
      updatedAt: seedNow
    });

    // Material requirement for conflict package (same part as release-ready)
    insertIgnore(sqlite, 'maintenance_work_package_material_requirements', {
      id: 'mmat-conflict-filter',
      workPackageId: 'mwp-mrov21-conflict',
      partId: 'inv-part-filter-c208-reserve',
      serializedPartId: null,
      requiredQuantity: 1,
      required: 1,
      status: 'REQUESTED',
      source: 'MROV21_CONFLICT',
      notes: 'Scenario B: Competing for same limited inventory part.',
      createdAt: context.at(-1, '14:10'),
      updatedAt: seedNow
    });

    // ============================================================================
    // SCENARIO C: TOOL CALIBRATION EXPIRED
    // Work package mwp-mrov1-active with expired calibration tool requirement
    // ============================================================================

    // Resource declarations for active package
    insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
      id: 'decl-active-material',
      workPackageId: 'mwp-mrov1-active',
      resourceType: 'MATERIAL',
      declaration: 'REQUIRED',
      reason: null,
      evidenceDocumentId: null,
      declaredBy: 'USR-MAINTENANCE-MANAGER',
      declaredAt: context.at(-1, '13:15'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
      id: 'decl-active-tool',
      workPackageId: 'mwp-mrov1-active',
      resourceType: 'TOOL',
      declaration: 'REQUIRED',
      reason: null,
      evidenceDocumentId: null,
      declaredBy: 'USR-MAINTENANCE-MANAGER',
      declaredAt: context.at(-1, '13:15'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
      id: 'decl-active-personnel',
      workPackageId: 'mwp-mrov1-active',
      resourceType: 'PERSONNEL',
      declaration: 'REQUIRED',
      reason: null,
      evidenceDocumentId: null,
      declaredBy: 'USR-MAINTENANCE-MANAGER',
      declaredAt: context.at(-1, '13:15'),
      updatedAt: seedNow
    });

    // Tool requirement for active package (using expired calibration tool)
    insertIgnore(sqlite, 'maintenance_tool_requirements', {
      id: 'tool-req-active-expired',
      workPackageId: 'mwp-mrov1-active',
      jobCardId: 'mjc-mrov1-active-001',
      toolMasterId: 'mtool-mrov2-expired',
      toolType: 'TEST_EQUIPMENT',
      quantity: 1,
      requiredStationId: 'st-djj',
      requiredFrom: context.at(-1, '14:00'),
      requiredUntil: context.at(0, '18:00'),
      status: 'REQUIRED',
      createdBy: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '13:20'),
      updatedAt: seedNow
    });

    // Personnel requirements for active package
    insertIgnore(sqlite, 'maintenance_personnel_requirements', {
      id: 'personnel-req-active-mechanic',
      workPackageId: 'mwp-mrov1-active',
      jobCardId: 'mjc-mrov1-active-001',
      roleType: 'MECHANIC',
      requiredCount: 1,
      requiredLicenceType: 'AMEL',
      requiredQualification: 'PAC 750XL',
      requiredAuthorization: 'MECHANIC_SIGN_OFF',
      aircraftType: 'PAC 750XL',
      dutyStationId: 'st-djj',
      requiredFrom: context.at(-1, '14:00'),
      requiredUntil: context.at(0, '18:00'),
      status: 'FULFILLED',
      createdBy: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '13:20'),
      updatedAt: seedNow
    });

    // ============================================================================
    // SCENARIO D: PERSONNEL AUTHORIZATION EXPIRED
    // Create expired authorization and link to personnel requirement
    // ============================================================================

    // Create expired authorization for technician
    insertIgnore(sqlite, 'maintenance_company_authorizations', {
      id: 'mca-mrov21-expired',
      authorizationNumber: 'PTAMA-MRO-AUTH-EXPIRED-001',
      personnelId: 'crew-maintenance-technician',
      actorUserId: 'USR-MAINTENANCE-TECHNICIAN',
      licenseId: 'plic-crew-maintenance-technician',
      licenseNumber: 'AME-TECH-MRO-001',
      status: 'INACTIVE',
      validFrom: context.date(-180),
      validUntil: context.date(-1),
      permittedActionsJson: JSON.stringify(['MECHANIC_SIGN_OFF']),
      aircraftTypeScopeJson: JSON.stringify(['Cessna Caravan 208B']),
      aircraftRegistrationScopeJson: JSON.stringify([]),
      notes: 'Expired authorization for Scenario D verification.',
      issuedBy: 'PT AMA Maintenance Control',
      version: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    // Create work package for expired authorization scenario
    insertIgnore(sqlite, 'maintenance_work_packages', {
      id: 'mwp-mrov21-expired-auth',
      packageNumber: 'MWP-MROV21-EXPIRED-AUTH',
      aircraftId: 'ac-pk-mra',
      sourceFlightId: null,
      primaryDefectId: 'adefect-mrov21-expired-auth',
      title: 'Electrical system inspection - authorization verification',
      priority: 'NORMAL',
      executionMode: 'INTERNAL',
      vendorId: null,
      status: 'OPEN',
      planningNote:
        'Scenario D: Personnel requirement with expired authorization. Assignment should be blocked.',
      financialStatus: 'NOT_READY',
      version: 1,
      createdByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '15:00'),
      updatedAt: seedNow
    });

    // Resource declarations for expired auth package
    insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
      id: 'decl-expired-auth-personnel',
      workPackageId: 'mwp-mrov21-expired-auth',
      resourceType: 'PERSONNEL',
      declaration: 'REQUIRED',
      reason: null,
      evidenceDocumentId: null,
      declaredBy: 'USR-MAINTENANCE-MANAGER',
      declaredAt: context.at(-1, '15:05'),
      updatedAt: seedNow
    });

    // Personnel requirement that will fail authorization check
    insertIgnore(sqlite, 'maintenance_personnel_requirements', {
      id: 'personnel-req-expired-auth',
      workPackageId: 'mwp-mrov21-expired-auth',
      jobCardId: null,
      roleType: 'MECHANIC',
      requiredCount: 1,
      requiredLicenceType: 'AMEL',
      requiredQualification: 'Cessna Caravan 208B',
      requiredAuthorization: 'MECHANIC_SIGN_OFF',
      aircraftType: 'Cessna Caravan 208B',
      dutyStationId: 'st-djj',
      requiredFrom: context.at(0, '09:00'),
      requiredUntil: context.at(1, '18:00'),
      status: 'REQUIRED',
      createdBy: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '15:10'),
      updatedAt: seedNow
    });

    // Attempted assignment with expired authorization (ineligible)
    insertIgnore(sqlite, 'maintenance_personnel_assignments', {
      id: 'assign-expired-auth-blocked',
      personnelRequirementId: 'personnel-req-expired-auth',
      personnelId: 'crew-maintenance-technician',
      workPackageId: 'mwp-mrov21-expired-auth',
      jobCardId: null,
      roleType: 'MECHANIC',
      status: 'ASSIGNED',
      eligibilityStatus: 'INELIGIBLE',
      eligibilitySnapshotJson: JSON.stringify({
        licenceValid: true,
        qualificationValid: true,
        authorizationValid: false,
        authorizationExpired: true,
        authorizationExpiryDate: context.date(-1),
        evaluatedAt: context.at(-1, '15:15'),
        blocker: 'Company authorization expired'
      }),
      assignedBy: 'USR-MAINTENANCE-MANAGER',
      assignedAt: context.at(-1, '15:15'),
      confirmedAt: null,
      releasedAt: null,
      createdAt: context.at(-1, '15:15'),
      updatedAt: seedNow
    });

    // ============================================================================
    // SCENARIO E: RETURN AND CANCELLATION
    // Completed work package with returned materials and tools
    // ============================================================================

    // Resource declarations for history package (completed)
    insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
      id: 'decl-history-material',
      workPackageId: 'mwp-mrov1-history',
      resourceType: 'MATERIAL',
      declaration: 'REQUIRED',
      reason: null,
      evidenceDocumentId: null,
      declaredBy: 'USR-MAINTENANCE-MANAGER',
      declaredAt: context.at(-1, '09:55'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
      id: 'decl-history-tool',
      workPackageId: 'mwp-mrov1-history',
      resourceType: 'TOOL',
      declaration: 'REQUIRED',
      reason: null,
      evidenceDocumentId: null,
      declaredBy: 'USR-MAINTENANCE-MANAGER',
      declaredAt: context.at(-1, '09:55'),
      updatedAt: seedNow
    });

    insertIgnore(sqlite, 'maintenance_resource_planning_declarations', {
      id: 'decl-history-personnel',
      workPackageId: 'mwp-mrov1-history',
      resourceType: 'PERSONNEL',
      declaration: 'REQUIRED',
      reason: null,
      evidenceDocumentId: null,
      declaredBy: 'USR-MAINTENANCE-MANAGER',
      declaredAt: context.at(-1, '09:55'),
      updatedAt: seedNow
    });

    // Tool requirement for history package (returned)
    insertIgnore(sqlite, 'maintenance_tool_requirements', {
      id: 'tool-req-history-returned',
      workPackageId: 'mwp-mrov1-history',
      jobCardId: 'mjc-mrov1-history-001',
      toolMasterId: 'mtool-mrov2-calibrated',
      toolType: 'TEST_EQUIPMENT',
      quantity: 1,
      requiredStationId: 'st-djj',
      requiredFrom: context.at(-2, '09:00'),
      requiredUntil: context.at(-1, '12:00'),
      status: 'RETURNED',
      createdBy: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-2, '09:00'),
      updatedAt: seedNow
    });

    // Personnel requirements for history package (fulfilled and released)
    insertIgnore(sqlite, 'maintenance_personnel_requirements', {
      id: 'personnel-req-history-mechanic',
      workPackageId: 'mwp-mrov1-history',
      jobCardId: 'mjc-mrov1-history-001',
      roleType: 'MECHANIC',
      requiredCount: 1,
      requiredLicenceType: 'AMEL',
      requiredQualification: 'Pilatus PC-6',
      requiredAuthorization: 'MECHANIC_SIGN_OFF',
      aircraftType: 'Pilatus PC-6',
      dutyStationId: 'st-djj',
      requiredFrom: context.at(-2, '09:00'),
      requiredUntil: context.at(-1, '12:00'),
      status: 'FULFILLED',
      createdBy: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-2, '09:00'),
      updatedAt: seedNow
    });

    // Personnel assignment for history package (released after completion)
    insertIgnore(sqlite, 'maintenance_personnel_assignments', {
      id: 'assign-history-mechanic-released',
      personnelRequirementId: 'personnel-req-history-mechanic',
      personnelId: 'crew-maintenance-manager',
      workPackageId: 'mwp-mrov1-history',
      jobCardId: 'mjc-mrov1-history-001',
      roleType: 'MECHANIC',
      status: 'RELEASED',
      eligibilityStatus: 'ELIGIBLE',
      eligibilitySnapshotJson: JSON.stringify({
        licenceValid: true,
        qualificationValid: true,
        authorizationValid: true,
        evaluatedAt: context.at(-2, '09:05')
      }),
      assignedBy: 'USR-MAINTENANCE-MANAGER',
      assignedAt: context.at(-2, '09:05'),
      confirmedAt: context.at(-2, '09:10'),
      releasedAt: context.at(-1, '11:45'),
      createdAt: context.at(-2, '09:05'),
      updatedAt: seedNow
    });

    // ============================================================================
    // FLIGHT-MRO LINKS
    // Link existing flights to work packages
    // ============================================================================

    // Query existing flight operations to link
    const existingFlights = sqlite
      .prepare(
        `SELECT id, aircraft_id 
         FROM flight_operations 
         WHERE aircraft_id IN ('ac-pk-mra', 'ac-pk-mrb', 'ac-pk-amc')
         LIMIT 3`
      )
      .all() as Array<{ id: string; aircraft_id: string }>;

    // Link flights to work packages if they exist
    if (existingFlights.length > 0) {
      const flight1 = existingFlights[0];
      if (flight1) {
        insertIgnore(sqlite, 'maintenance_flight_mro_links', {
          id: 'flight-mro-link-release',
          flightOrderId: flight1.id,
          workPackageId: 'mwp-mrov1-release-ready',
          aircraftId: flight1.aircraft_id,
          affectsServiceability: 1,
          linkReason: 'Aircraft requires technical release before next flight',
          status: 'ACTIVE',
          linkedBy: 'USR-MAINTENANCE-MANAGER',
          linkedAt: context.at(-1, '13:30'),
          unlinkedBy: null,
          unlinkedAt: null,
          unlinkReason: null,
          createdAt: context.at(-1, '13:30'),
          updatedAt: seedNow
        });
      }

      const flight2 = existingFlights[1];
      if (flight2) {
        insertIgnore(sqlite, 'maintenance_flight_mro_links', {
          id: 'flight-mro-link-active',
          flightOrderId: flight2.id,
          workPackageId: 'mwp-mrov1-active',
          aircraftId: flight2.aircraft_id,
          affectsServiceability: 1,
          linkReason: 'Flight grounded pending maintenance completion',
          status: 'ACTIVE',
          linkedBy: 'USR-MAINTENANCE-MANAGER',
          linkedAt: context.at(-1, '13:20'),
          unlinkedBy: null,
          unlinkedAt: null,
          unlinkReason: null,
          createdAt: context.at(-1, '13:20'),
          updatedAt: seedNow
        });
      }

      const flight3 = existingFlights[2];
      if (flight3) {
        insertIgnore(sqlite, 'maintenance_flight_mro_links', {
          id: 'flight-mro-link-history-cancelled',
          flightOrderId: flight3.id,
          workPackageId: 'mwp-mrov1-history',
          aircraftId: flight3.aircraft_id,
          affectsServiceability: 1,
          linkReason: 'Historical flight affected by completed maintenance',
          status: 'CANCELLED',
          linkedBy: 'USR-MAINTENANCE-MANAGER',
          linkedAt: context.at(-2, '09:00'),
          unlinkedBy: 'USR-MAINTENANCE-MANAGER',
          unlinkedAt: context.at(-1, '11:45'),
          unlinkReason: 'Work package completed and aircraft released',
          createdAt: context.at(-2, '09:00'),
          updatedAt: seedNow
        });
      }
    }

    // ============================================================================
    // ADDITIONAL TOOL ALLOCATIONS (v2 enhanced)
    // ============================================================================

    // Tool allocation for release-ready package (allocated and in use)
    insertIgnore(sqlite, 'maintenance_tool_allocations_v2', {
      id: 'tool-alloc-v2-release',
      toolRequirementId: 'tool-req-release-001',
      toolId: 'mtool-mrov2-calibrated',
      workPackageId: 'mwp-mrov1-release-ready',
      jobCardId: 'mjc-mrov1-release-001',
      aircraftId: 'ac-pk-mra',
      stationId: 'st-djj',
      status: 'ALLOCATED',
      allocatedBy: 'USR-MAINTENANCE-MANAGER',
      allocatedAt: context.at(-1, '13:50'),
      custodianPersonnelId: 'crew-maintenance-manager',
      custodyStartedAt: context.at(-1, '13:55'),
      returnedBy: null,
      returnedAt: null,
      returnCondition: null,
      returnNote: null,
      createdAt: context.at(-1, '13:50'),
      updatedAt: seedNow
    });

    // Tool allocation for history package (returned)
    insertIgnore(sqlite, 'maintenance_tool_allocations_v2', {
      id: 'tool-alloc-v2-history-returned',
      toolRequirementId: 'tool-req-history-returned',
      toolId: 'mtool-mrov2-calibrated',
      workPackageId: 'mwp-mrov1-history',
      jobCardId: 'mjc-mrov1-history-001',
      aircraftId: 'ac-pk-ama',
      stationId: 'st-djj',
      status: 'RETURNED',
      allocatedBy: 'USR-MAINTENANCE-MANAGER',
      allocatedAt: context.at(-2, '09:10'),
      custodianPersonnelId: 'crew-maintenance-manager',
      custodyStartedAt: context.at(-2, '09:15'),
      returnedBy: 'crew-maintenance-manager',
      returnedAt: context.at(-1, '11:40'),
      returnCondition: 'GOOD',
      returnNote: 'Tool returned in good condition after maintenance completion',
      createdAt: context.at(-2, '09:10'),
      updatedAt: seedNow
    });

    // ============================================================================
    // INVENTORY RESERVATIONS
    // ============================================================================

    // Reservation for release-ready package (active)
    insertIgnore(sqlite, 'maintenance_inventory_reservations', {
      id: 'res-release-filter',
      reservationNumber: 'RES-MROV21-001',
      materialRequirementId: 'mmat-release-filter',
      workPackageId: 'mwp-mrov1-release-ready',
      jobCardId: 'mjc-mrov1-release-001',
      aircraftId: 'ac-pk-mra',
      flightOrderId: null,
      inventoryItemId: 'inv-bal-filter-c208-reserve',
      partId: 'inv-part-filter-c208-reserve',
      serializedPartId: null,
      lotNumber: null,
      serialNumber: null,
      stationId: 'st-bik',
      inventoryLocationId: 'inv-bin-bik-mro-usable',
      quantity: 1,
      unit: 'EA',
      expiryAt: null,
      certificateReference: null,
      certificateDocumentId: null,
      status: 'ISSUED',
      issueId: null,
      issueMovementId: null,
      issuedQuantity: 1,
      issuedBy: 'USR-MAINTENANCE-MANAGER',
      issuedAt: context.at(-1, '13:45'),
      issueIdempotencyKey: 'seed-mrov21-issue-release-filter',
      reservedBy: 'USR-MAINTENANCE-MANAGER',
      reservedAt: context.at(-1, '13:40'),
      releasedBy: null,
      releasedAt: null,
      releaseReason: null,
      version: 1,
      createdAt: context.at(-1, '13:40'),
      updatedAt: seedNow
    });

    // Reservation event for release package
    insertIgnore(sqlite, 'maintenance_reservation_events', {
      id: 'res-event-release-created',
      reservationId: 'res-release-filter',
      eventType: 'RESERVED',
      quantity: 1,
      actorUserId: 'USR-MAINTENANCE-MANAGER',
      actorRole: 'Maintenance Manager',
      reason: 'Material reserved for release-ready work package',
      beforeSnapshotJson: '{}',
      afterSnapshotJson: JSON.stringify({
        status: 'ACTIVE',
        quantity: 1
      }),
      correlationId: 'seed-mrov21',
      idempotencyKey: 'seed-mrov21-res-release',
      occurredAt: context.at(-1, '13:40'),
      createdAt: context.at(-1, '13:40')
    });

    insertIgnore(sqlite, 'inventory_movements', {
      id: 'inv-move-mro-release-filter',
      movementNumber: 'MOV-MROV21-ISSUE-001',
      movementType: 'ISSUE',
      sourceType: 'MAINTENANCE_PART_ISSUE',
      sourceId: 'inv-issue-mro-release-filter',
      stationId: 'st-bik',
      destinationStationId: null,
      aircraftId: 'ac-pk-mra',
      flightId: null,
      reason: 'Seeded M2 issue for release-ready resource lifecycle.',
      status: 'POSTED',
      reversalOfMovementId: null,
      totalBaseValueIdr: 0,
      isFinalized: 0,
      createdByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: context.at(-1, '13:45')
    });

    insertIgnore(sqlite, 'inventory_movement_lines', {
      id: 'inv-move-line-mro-release-filter',
      movementId: 'inv-move-mro-release-filter',
      partId: 'inv-part-filter-c208-reserve',
      fromBinId: 'inv-bin-bik-mro-usable',
      toBinId: null,
      lotId: 'inv-lot-filter-c208-reserve',
      serialId: null,
      conditionFrom: 'SERVICEABLE',
      conditionTo: null,
      quantity: 1,
      sourceUnitCostMinor: 0,
      currencyId: 'cur-idr',
      exchangeRateToIdrMicros: 1_000_000,
      baseUnitCostIdr: 0,
      baseValueIdr: 0
    });

    sqlite
      .prepare(`UPDATE inventory_movements SET is_finalized = 1 WHERE id = ?`)
      .run('inv-move-mro-release-filter');

    insertIgnore(sqlite, 'maintenance_part_issues', {
      id: 'inv-issue-mro-release-filter',
      issueNumber: 'ISS-MROV21-001',
      maintenanceHandoffId: null,
      targetType: 'AIRCRAFT',
      targetId: 'ac-pk-mra',
      assetMaintenanceWorkOrderId: null,
      aircraftId: 'ac-pk-mra',
      flightId: null,
      warehouseId: 'inv-wh-bik-mro',
      workPackageId: 'mwp-mrov1-release-ready',
      jobCardId: 'mjc-mrov1-release-001',
      reason: 'Seeded M2 issue for release-ready resource lifecycle.',
      movementId: 'inv-move-mro-release-filter',
      status: 'ISSUED',
      totalPartsValueIdr: 0,
      issuedByUserId: 'USR-MAINTENANCE-MANAGER',
      issuedAt: context.at(-1, '13:45')
    });

    insertIgnore(sqlite, 'maintenance_part_issue_lines', {
      id: 'inv-issue-line-mro-release-filter',
      issueId: 'inv-issue-mro-release-filter',
      partId: 'inv-part-filter-c208-reserve',
      quantity: 1,
      baseValueIdr: 0,
      note: 'Seeded release-ready M2 issue line.'
    });

    insertIgnore(sqlite, 'maintenance_material_installations', {
      id: 'mmat-install-release-filter',
      installationNumber: 'MINST-MROV21-001',
      materialRequirementId: 'mmat-release-filter',
      reservationId: 'res-release-filter',
      issueId: 'inv-issue-mro-release-filter',
      inventoryComponentInstallationId: null,
      workPackageId: 'mwp-mrov1-release-ready',
      jobCardId: 'mjc-mrov1-release-001',
      aircraftId: 'ac-pk-mra',
      partId: 'inv-part-filter-c208-reserve',
      serializedPartId: null,
      sourceWarehouseId: 'inv-wh-bik-mro',
      sourceBinId: 'inv-bin-bik-mro-usable',
      lotNumber: 'inv-lot-filter-c208-reserve',
      serialNumber: null,
      certificateReference: 'ARC-C208-FLT-260701',
      quantity: 1,
      unit: 'EA',
      position: 'FILTER BAY POSITION',
      status: 'INSTALLED',
      installedBy: 'USR-MAINTENANCE-MANAGER',
      installedAt: context.at(-1, '14:00'),
      idempotencyKey: 'seed-mrov21-install-release-filter',
      createdAt: context.at(-1, '14:00'),
      updatedAt: seedNow
    });

    sqlite
      .prepare(
        `UPDATE inventory_stock_balances SET on_hand_quantity = 19, updated_at = ? WHERE id = ?`
      )
      .run(seedNow, 'inv-bal-filter-c208-reserve');
    sqlite
      .prepare(
        `UPDATE maintenance_work_package_material_requirements SET status = 'ISSUED', updated_at = ? WHERE id = ?`
      )
      .run(seedNow, 'mmat-release-filter');

    // ============================================================================
    // TOOL ALLOCATION EVENTS
    // ============================================================================

    // Tool allocation event for release package
    insertIgnore(sqlite, 'maintenance_tool_allocation_events', {
      id: 'tool-alloc-event-release-allocated',
      allocationId: 'tool-alloc-v2-release',
      eventType: 'ALLOCATED',
      actorUserId: 'USR-MAINTENANCE-MANAGER',
      actorRole: 'Maintenance Manager',
      reason: 'Tool allocated for release-ready work package',
      beforeSnapshotJson: '{}',
      afterSnapshotJson: JSON.stringify({
        status: 'ALLOCATED',
        toolId: 'mtool-mrov2-calibrated'
      }),
      occurredAt: context.at(-1, '13:50'),
      createdAt: context.at(-1, '13:50')
    });

    insertIgnore(sqlite, 'maintenance_tool_allocation_events', {
      id: 'tool-alloc-event-release-custody',
      allocationId: 'tool-alloc-v2-release',
      eventType: 'CUSTODY_ASSIGNED',
      actorUserId: 'USR-MAINTENANCE-MANAGER',
      actorRole: 'Maintenance Manager',
      reason: 'Custody assigned to mechanic',
      beforeSnapshotJson: JSON.stringify({
        status: 'ALLOCATED',
        custodianPersonnelId: null
      }),
      afterSnapshotJson: JSON.stringify({
        status: 'ALLOCATED',
        custodianPersonnelId: 'crew-maintenance-manager'
      }),
      occurredAt: context.at(-1, '13:55'),
      createdAt: context.at(-1, '13:55')
    });

    // Tool allocation event for history package (returned)
    insertIgnore(sqlite, 'maintenance_tool_allocation_events', {
      id: 'tool-alloc-event-history-returned',
      allocationId: 'tool-alloc-v2-history-returned',
      eventType: 'RETURNED',
      actorUserId: 'USR-MAINTENANCE-MANAGER',
      actorRole: 'Maintenance Manager',
      reason: 'Tool returned after work package completion',
      beforeSnapshotJson: JSON.stringify({
        status: 'ALLOCATED',
        custodianPersonnelId: 'crew-maintenance-manager'
      }),
      afterSnapshotJson: JSON.stringify({
        status: 'RETURNED',
        returnCondition: 'GOOD'
      }),
      occurredAt: context.at(-1, '11:40'),
      createdAt: context.at(-1, '11:40')
    });

    // ============================================================================
    // PERSONNEL ELIGIBILITY EVENTS
    // ============================================================================

    // Eligibility evaluation for release package assignments
    insertIgnore(sqlite, 'maintenance_personnel_eligibility_events', {
      id: 'elig-event-release-mechanic',
      assignmentId: 'assign-release-mechanic',
      eventType: 'EVALUATED',
      eligibilityStatus: 'ELIGIBLE',
      snapshotJson: JSON.stringify({
        licenceValid: true,
        qualificationValid: true,
        authorizationValid: true,
        evaluatedAt: context.at(-1, '13:35')
      }),
      evaluatedBy: 'SYSTEM',
      evaluatedAt: context.at(-1, '13:35'),
      createdAt: context.at(-1, '13:35')
    });

    insertIgnore(sqlite, 'maintenance_personnel_eligibility_events', {
      id: 'elig-event-release-inspector',
      assignmentId: 'assign-release-inspector',
      eventType: 'EVALUATED',
      eligibilityStatus: 'ELIGIBLE',
      snapshotJson: JSON.stringify({
        licenceValid: true,
        qualificationValid: true,
        authorizationValid: true,
        evaluatedAt: context.at(-1, '13:35')
      }),
      evaluatedBy: 'SYSTEM',
      evaluatedAt: context.at(-1, '13:35'),
      createdAt: context.at(-1, '13:35')
    });

    // Eligibility evaluation for expired auth scenario (ineligible)
    insertIgnore(sqlite, 'maintenance_personnel_eligibility_events', {
      id: 'elig-event-expired-auth-blocked',
      assignmentId: 'assign-expired-auth-blocked',
      eventType: 'EVALUATED',
      eligibilityStatus: 'INELIGIBLE',
      snapshotJson: JSON.stringify({
        licenceValid: true,
        qualificationValid: true,
        authorizationValid: false,
        authorizationExpired: true,
        blocker: 'Company authorization expired',
        evaluatedAt: context.at(-1, '15:15')
      }),
      evaluatedBy: 'SYSTEM',
      evaluatedAt: context.at(-1, '15:15'),
      createdAt: context.at(-1, '15:15')
    });
  });

  seed();
}
