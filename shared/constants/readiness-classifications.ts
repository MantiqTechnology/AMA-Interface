export type AssurancePhaseCode = 'PLANNING' | 'DEPARTURE';

export interface ReadinessClassification {
  check: string;
  classification: 'SYSTEM_CHECK' | 'MANUAL_ATTESTATION' | 'ENFORCED' | 'INFORMATIONAL';
  gate: boolean;
  verificationRequired: boolean;
  evidenceRequired: boolean;
  expiryHours?: number; // How many hours before verification expires
  sourceModule: string; // Which module owns the source data
  ownerRole: string; // Who is responsible for maintaining this check
  evidenceType?: string; // Type of evidence required if applicable
  approvalStages: ('STATION' | 'OCC')[]; // Stages required for approval
  contextualRoute?: string; // Route to deep-link to source record
  // Planning checks gate approval/scheduling; departure checks gate READY_FOR_DEPARTURE.
  // Closure-scope checks (e.g. destination sign-off) leave this unset.
  assurancePhase?: AssurancePhaseCode;
  // Planning checks with this policy are recalculated from source during departure
  // assurance evaluation, without creating a duplicate source of truth.
  revalidateBeforeDeparture?: boolean;
  // Compatibility alias: this code resolves to another canonical check and must never
  // produce a duplicate gate row.
  aliasOf?: string;
}

export const READINESS_CLASSIFICATIONS: ReadinessClassification[] = [
  // ---------------------------------------------------------------------------
  // PLANNING phase — gates READY_FOR_APPROVAL -> APPROVED -> SCHEDULED.
  // Never requires manifest, DG acceptance, fuel, handling, or station sign-off.
  // ---------------------------------------------------------------------------
  {
    check: 'ROUTE_AVAILABILITY',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'OCC Staff',
    approvalStages: [],
    assurancePhase: 'PLANNING',
    revalidateBeforeDeparture: true
  },
  {
    check: 'AIRCRAFT_SERVICEABILITY',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'Maintenance Reviewer',
    approvalStages: [],
    assurancePhase: 'PLANNING',
    revalidateBeforeDeparture: true
  },
  {
    check: 'AIRCRAFT_LOCATION',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'Flight Coordinator',
    approvalStages: [],
    assurancePhase: 'PLANNING',
    revalidateBeforeDeparture: true
  },
  {
    check: 'AIRCRAFT_SCHEDULE',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'Flight Coordinator',
    approvalStages: [],
    assurancePhase: 'PLANNING',
    revalidateBeforeDeparture: true
  },
  {
    check: 'AIRCRAFT_CAPACITY',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'OCC Staff',
    approvalStages: [],
    assurancePhase: 'PLANNING'
  },
  {
    check: 'CREW_AVAILABILITY',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'Chief Pilot',
    approvalStages: [],
    assurancePhase: 'PLANNING',
    revalidateBeforeDeparture: true
  },
  {
    check: 'CREW_LICENSE_MEDICAL',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'Chief Pilot',
    approvalStages: [],
    assurancePhase: 'PLANNING',
    revalidateBeforeDeparture: true
  },
  {
    check: 'PLANNING_DOCUMENTS',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'documents',
    ownerRole: 'OCC Staff',
    evidenceType: 'OPERATIONAL_DOCUMENT',
    approvalStages: [],
    assurancePhase: 'PLANNING'
  },
  {
    check: 'FINANCE_INITIALIZED',
    classification: 'SYSTEM_CHECK',
    gate: false,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'finance',
    ownerRole: 'Finance Reviewer',
    approvalStages: [],
    assurancePhase: 'PLANNING'
  },
  {
    check: 'SEPARATION_OF_DUTIES',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'finance',
    ownerRole: 'Operation Manager',
    approvalStages: [],
    assurancePhase: 'PLANNING'
  },

  {
    // Approval is a prerequisite of lock; MANIFEST_LOCKED is the sole departure gate
    // so this entry stays non-gating to avoid a duplicate manifest gate.
    check: 'MANIFEST_APPROVED',
    classification: 'SYSTEM_CHECK',
    gate: false,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'manifest',
    ownerRole: 'Loadmaster',
    evidenceType: 'MANIFEST_APPROVAL',
    approvalStages: [],
    assurancePhase: 'DEPARTURE'
  },
  {
    check: 'MANIFEST_LOCKED',
    classification: 'ENFORCED',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'manifest',
    ownerRole: 'OCC Staff',
    evidenceType: 'MANIFEST_LOCK',
    approvalStages: [],
    assurancePhase: 'DEPARTURE',
    contextualRoute: '/flights/manifest'
  },
  {
    check: 'DG_ACCEPTANCE',
    classification: 'ENFORCED',
    gate: true, // conditional: only when DG items exist on the cargo manifest
    verificationRequired: false,
    evidenceRequired: true,
    sourceModule: 'manifest',
    ownerRole: 'OCC Staff',
    evidenceType: 'DG_ACCEPTANCE_RECORD',
    approvalStages: [],
    assurancePhase: 'DEPARTURE',
    contextualRoute: '/flights/manifest'
  },
  {
    check: 'FUEL_CONFIRMED',
    classification: 'SYSTEM_CHECK',
    gate: true, // conditional: fuel workflow or explicit no-uplift policy
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'fuel',
    ownerRole: 'Station Admin',
    evidenceType: 'FUEL_CONFIRMATION',
    approvalStages: [],
    assurancePhase: 'DEPARTURE'
  },
  {
    check: 'HANDLING_CONFIRMED',
    classification: 'MANUAL_ATTESTATION',
    gate: true, // conditional: commercial flights requiring handling
    verificationRequired: true,
    evidenceRequired: true,
    sourceModule: 'station',
    ownerRole: 'Station Admin',
    evidenceType: 'HANDLING_CONFIRMATION',
    approvalStages: [],
    assurancePhase: 'DEPARTURE',
    contextualRoute: '/flights/station-operations'
  },
  {
    check: 'DEPARTURE_DOCUMENTS',
    classification: 'MANUAL_ATTESTATION',
    gate: true, // all service types except POSITIONING
    verificationRequired: true,
    evidenceRequired: true,
    sourceModule: 'documents',
    ownerRole: 'Station Admin',
    evidenceType: 'OPERATIONAL_DOCUMENT',
    approvalStages: [],
    assurancePhase: 'DEPARTURE',
    contextualRoute: '/flights/station-operations'
  },
  {
    check: 'ORIGIN_OPERATIONAL_TASKS',
    classification: 'ENFORCED',
    gate: true,
    verificationRequired: true,
    evidenceRequired: true,
    sourceModule: 'station',
    ownerRole: 'Station Admin',
    evidenceType: 'STATION_TASK_COMPLETION',
    approvalStages: [],
    assurancePhase: 'DEPARTURE',
    contextualRoute: '/flights/station-operations'
  },
  {
    check: 'ORIGIN_STATION_SIGNOFF',
    classification: 'ENFORCED',
    gate: true,
    verificationRequired: true,
    evidenceRequired: true,
    expiryHours: 24, // Sign-off valid for 24 hours before departure
    sourceModule: 'station',
    ownerRole: 'Origin Station Admin',
    evidenceType: 'ORIGIN_SIGNOFF',
    approvalStages: ['STATION', 'OCC'],
    contextualRoute: '/flights/station-operations',
    assurancePhase: 'DEPARTURE'
  },

  // ---------------------------------------------------------------------------
  // Compatibility alias — legacy REQUIRED_DOCUMENTS resolves to
  // DEPARTURE_DOCUMENTS and must never create a second gate row.
  // ---------------------------------------------------------------------------
  {
    check: 'REQUIRED_DOCUMENTS',
    classification: 'MANUAL_ATTESTATION',
    gate: true,
    verificationRequired: true,
    evidenceRequired: true,
    sourceModule: 'documents',
    ownerRole: 'Station Admin',
    evidenceType: 'OPERATIONAL_DOCUMENT',
    approvalStages: [],
    assurancePhase: 'DEPARTURE',
    aliasOf: 'DEPARTURE_DOCUMENTS'
  },

  // ---------------------------------------------------------------------------
  // Closure scope — not a planning or departure gate. assurancePhase stays unset.
  // ---------------------------------------------------------------------------
  {
    check: 'DESTINATION_STATION_SIGNOFF',
    classification: 'ENFORCED',
    gate: true,
    verificationRequired: true,
    evidenceRequired: true,
    expiryHours: 24, // Sign-off valid for 24 hours before arrival
    sourceModule: 'station',
    ownerRole: 'Destination Station Admin',
    evidenceType: 'DESTINATION_SIGNOFF',
    approvalStages: ['STATION', 'OCC'],
    contextualRoute: '/flights/station-operations'
  }
];

export const getReadinessClassification = (
  checkCode: string
): ReadinessClassification | undefined => {
  return READINESS_CLASSIFICATIONS.find((c) => c.check === checkCode);
};

// Resolves compatibility aliases (e.g. REQUIRED_DOCUMENTS -> DEPARTURE_DOCUMENTS)
// so callers never evaluate the same gate twice.
export const resolveReadinessCheckCode = (checkCode: string): string => {
  return getReadinessClassification(checkCode)?.aliasOf ?? checkCode;
};

export const getReadinessClassificationsByPhase = (
  phase: AssurancePhaseCode
): ReadinessClassification[] => {
  return READINESS_CLASSIFICATIONS.filter((c) => c.assurancePhase === phase && !c.aliasOf);
};
