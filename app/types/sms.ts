export interface SmsFilter {
  dateRange: string;
  station: string;
  aircraft: string;
  riskLevel: string;
}

export interface Trend {
  icon: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface Kpi {
  key: string;
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: Trend;
  target?: string;
}

export interface ChartSegment {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface ChartRow {
  label: string;
  value: number | string;
  percent: number;
  color: string;
}

export interface Finding {
  priority: 'High' | 'Medium' | 'Low';
  id: string;
  finding: string;
  station: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  owner: string;
  dueDate: string;
  status: 'Open' | 'Due Soon' | 'Overdue' | 'Closed';
}

// ── 1. FRAT (Flight Risk Assessment) ──────────────────────────────────
export interface FratEntry {
  flightId: string;
  flightNumber: string;
  route: string;
  aircraftReg: string;
  picName: string;
  totalScore: number;
  riskZone: 'GREEN' | 'YELLOW' | 'RED';
  isHardLocked: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'OVERRIDDEN' | 'CLEARED';
}

// ── 2. CAPA Management ────────────────────────────────────────────────
export interface CapaTicketItem {
  id: string;
  ticketNumber: string;
  sourceReportId?: string | null;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NEW' | 'INVESTIGATION' | 'ACTION' | 'VERIFIED' | 'CLOSED';
  assignedToName?: string;
  dueDate: string;
  isOverdueEscalated: boolean;
}

// ── 3. Emergency Response Plan (ERP) ──────────────────────────────────
export interface EmergencyActivationItem {
  id: string;
  activationNumber: string;
  flightNumber?: string;
  aircraftReg?: string;
  stationCode?: string;
  icaoPhase: 'INCERFA' | 'ALERFA' | 'DETRESFA';
  natureOfEmergency: string;
  pob?: number;
  endurance?: string;
  lkp?: string;
  declaredBy: string;
  declaredAt: string;
  status: 'ACTIVE' | 'DOWNGRADED' | 'CLOSED';
}

// ── 4. Safety Assurance (Audits, MOC, SRB/SAG Meetings) ───────────────
export interface SafetyAuditItem {
  id: string;
  auditNumber: string;
  subject: string;
  auditorName: string;
  auditType: 'INTERNAL' | 'EXTERNAL';
  scheduledFrom: string;
  scheduledTo: string;
  findingsCount: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'ACTION_REQUIRED' | 'COMPLETED' | 'CANCELLED';
}

export interface SafetyMocItem {
  id: string;
  mocNumber: string;
  title: string;
  sponsorDepartment: string;
  progressPercentage: number;
  status: 'INITIATED' | 'RISK_ASSESSMENT' | 'IMPLEMENTATION' | 'CLOSED' | 'CANCELLED';
}

export interface SafetyMeetingItem {
  id: string;
  meetingType: 'SRB' | 'SAG' | 'AD_HOC';
  title: string;
  scheduledAt: string;
  location: string;
  status: 'SCHEDULED' | 'CONDUCTED' | 'CANCELLED';
  attendeesCount?: number;
}

// ── 5. SPI & Analytics ────────────────────────────────────────────────
export interface SpiMetricItem {
  code: string;
  name: string;
  currentValue: number;
  targetValue: number;
  alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL';
  unit: string;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
}

// ── 6. Safety Communications ──────────────────────────────────────────
export interface SafetyCommunicationItem {
  id: string;
  commType: 'FLASH' | 'BULLETIN' | 'LESSONS_LEARNED';
  urgency: 'NORMAL' | 'URGENT';
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string;
}

// ── 7. Regulatory Compliance (MOR/SDR, Certs, Manuals, Inbox) ─────────
export interface RegulatoryReportItem {
  id: string;
  referenceNumber: string;
  reportType: 'MOR' | 'SDR' | 'ASR' | 'INC' | 'VHR';
  targetAuthority: string;
  generatedAt: string;
  submittedAt?: string;
  authorityReceiptNumber?: string;
  status: 'DRAFT' | 'GENERATED' | 'PENDING_APPROVAL' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'NEED_REVISION';
}

export interface CompanyCertificateItem {
  id: string;
  certNumber: string;
  name: string;
  description: string;
  expiryDate: string;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
}

export interface OperationsManualItem {
  id: string;
  documentName: string;
  revision: string;
  updatedDate: string;
  status: 'APPROVED' | 'PENDING_DKUPPU' | 'UNDER_REVISION';
}

export interface AuthorityCorrespondenceItem {
  id: string;
  messageRef: string;
  authority: string;
  subject: string;
  message: string;
  receivedAt: string;
  status: 'UNREAD' | 'READ' | 'ACTION_REQUIRED';
}

// ── 8. Safety Training, Governance & Risk Register ────────────────────
export interface CrewCompetencyMatrixItem {
  id: string;
  name: string;
  license: string;
  role: string;
  base: string;
  sms: 'valid' | 'expiring' | 'expired' | 'na';
  smsExp?: string;
  crm: 'valid' | 'expiring' | 'expired' | 'na';
  crmExp?: string;
  dg: 'valid' | 'expiring' | 'expired' | 'na';
  dgExp?: string;
  cfit: 'valid' | 'expiring' | 'expired' | 'na';
  cfitExp?: string;
  mountain: 'valid' | 'expiring' | 'expired' | 'na';
  mountainExp?: string;
  status: 'Compliant' | 'Warning' | 'Roster Lock' | 'Suspended';
  statusColor: string;
}

export interface CorporateRiskRegisterItem {
  id: string;
  title: string;
  hazard: string;
  initialScore: string;
  initialLevel: string;
  initialColor: string;
  mitigation: string;
  residualScore: string;
  residualLevel: string;
  residualColor: string;
  owner: string;
  reviewFreq: string;
  status: 'ACTIVE' | 'MITIGATED' | 'CLOSED';
}

export interface SafetyGovernancePolicyItem {
  code: string;
  title: string;
  rev: string;
  signee: string;
  validUntil: string;
}

export interface JustCultureDecisionItem {
  id: string;
  sourceReportId: string;
  decisionPath: 'HUMAN_ERROR' | 'AT_RISK_BEHAVIOR' | 'RECKLESS_CONDUCT';
  actionType: 'SYSTEM_FIX_TRAINING' | 'COACHING_COUNSELING' | 'DISCIPLINARY';
  isNonPunitiveProtected: boolean;
  justificationNotes: string;
  assessedAt: string;
}