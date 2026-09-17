export type RegulatoryReportType = 'MOR' | 'SDR' | 'ASR' | 'INC' | 'VHR';
export type RegulatoryAuthority = 'DKUPPU' | 'KNKT' | 'Otban Wilayah X' | 'Otban Wilayah IX' | 'AirNav Indonesia';
export type RegulatoryStatus = 'Draft' | 'Pending Approval' | 'Submitted' | 'Acknowledged' | 'Need Revision';
export type CertStatus = 'Valid' | 'Expiring Soon' | 'Expired';
export type ManualApprovalStatus = 'Approved' | 'Pending DKUPPU' | 'Under Revision';

export interface RegulatoryReportItem {
  id: string;
  ref: string;
  type: RegulatoryReportType;
  sourceRef: string;
  subject: string;
  authority: RegulatoryAuthority | string;
  deadline: string;
  status: RegulatoryStatus;
  receiptNumber?: string;
  urgent: boolean;
  submittedAt?: string;
  createdAt: string;
}

export interface CompanyCertificateItem {
  id: string;
  name: string;
  desc: string;
  expiry: string;
  status: CertStatus;
  statusColor: 'success' | 'warning' | 'error';
  icon: string;
  certNumber: string;
}

export interface OperationsManualItem {
  id: string;
  doc: string;
  rev: string;
  date: string;
  status: ManualApprovalStatus;
  color: 'success' | 'warning' | 'error';
  icon: string;
}

export interface RegulatoryDeadlineItem {
  id: string;
  subject: string;
  timeLeft: string;
  progress: number;
}

export interface AuthorityMessageItem {
  ref: string;
  authority: string;
  subject: string;
  message: string;
  datetime: string;
  icon: string;
  color: 'success' | 'info' | 'warning' | 'primary' | 'error';
}

export interface RegulatoryDashboardSummary {
  aocDaysRemaining: number;
  aocExpiryDate: string;
  morFiledYtd: number;
  morPendingCount: number;
  avgSubmissionHours: number;
  manualApprovalsPending: number;
  reports: RegulatoryReportItem[];
  companyCertificates: CompanyCertificateItem[];
  manuals: OperationsManualItem[];
  upcomingDeadlines: RegulatoryDeadlineItem[];
  authorityInbox: AuthorityMessageItem[];
}