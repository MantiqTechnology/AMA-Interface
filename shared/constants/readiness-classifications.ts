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
}

export const READINESS_CLASSIFICATIONS: ReadinessClassification[] = [
  {
    check: 'ROUTE_AVAILABILITY',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'OCC Staff',
    approvalStages: []
  },
  {
    check: 'AIRCRAFT_SERVICEABILITY',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'Maintenance Reviewer',
    approvalStages: []
  },
  {
    check: 'AIRCRAFT_LOCATION',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'Flight Coordinator',
    approvalStages: []
  },
  {
    check: 'AIRCRAFT_SCHEDULE',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'Flight Coordinator',
    approvalStages: []
  },
  {
    check: 'AIRCRAFT_CAPACITY',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'OCC Staff',
    approvalStages: []
  },
  {
    check: 'CREW_AVAILABILITY',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'Chief Pilot',
    approvalStages: []
  },
  {
    check: 'CREW_LICENSE_MEDICAL',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'operations',
    ownerRole: 'Chief Pilot',
    approvalStages: []
  },
  {
    check: 'MANIFEST_APPROVED',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'manifest',
    ownerRole: 'Loadmaster',
    evidenceType: 'MANIFEST_APPROVAL',
    approvalStages: []
  },
  {
    check: 'DG_ACCEPTANCE',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'manifest',
    ownerRole: 'Operation Manager',
    evidenceType: 'DG_ACCEPTANCE_RECORD',
    approvalStages: []
  },
  {
    check: 'FUEL_CONFIRMED',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'fuel',
    ownerRole: 'Station Admin',
    evidenceType: 'FUEL_CONFIRMATION',
    approvalStages: []
  },
  {
    check: 'HANDLING_CONFIRMED',
    classification: 'MANUAL_ATTESTATION',
    gate: true,
    verificationRequired: true,
    evidenceRequired: true,
    sourceModule: 'station',
    ownerRole: 'Station Admin',
    evidenceType: 'HANDLING_CONFIRMATION',
    approvalStages: []
  },
  {
    check: 'FINANCE_INITIALIZED',
    classification: 'INFORMATIONAL',
    gate: false,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'finance',
    ownerRole: 'Finance Reviewer',
    approvalStages: []
  },
  {
    check: 'REQUIRED_DOCUMENTS',
    classification: 'MANUAL_ATTESTATION',
    gate: true,
    verificationRequired: true,
    evidenceRequired: true,
    sourceModule: 'documents',
    ownerRole: 'OCC Staff',
    evidenceType: 'OPERATIONAL_DOCUMENT',
    approvalStages: []
  },
  {
    check: 'SEPARATION_OF_DUTIES',
    classification: 'SYSTEM_CHECK',
    gate: true,
    verificationRequired: false,
    evidenceRequired: false,
    sourceModule: 'finance',
    ownerRole: 'Operation Manager',
    approvalStages: []
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
    contextualRoute: '/flights/station-operations'
  },
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
