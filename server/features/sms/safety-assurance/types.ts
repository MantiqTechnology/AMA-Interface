// server/features/sms/safety-assurance/types.ts

export type AuditType = 'INTERNAL' | 'EXTERNAL';
export type AuditStatus =
  'SCHEDULED' | 'IN_PROGRESS' | 'ACTION_REQUIRED' | 'COMPLETED' | 'CANCELLED';
export type MocStatus = 'INITIATED' | 'RISK_ASSESSMENT' | 'IMPLEMENTATION' | 'CLOSED' | 'CANCELLED';

export interface SafetyAuditDto {
  id: string;
  auditNumber: string;
  subject: string;
  auditorName: string;
  auditType: AuditType;
  scheduledFrom: string;
  scheduledTo: string;
  findingsCount: number;
  status: AuditStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyMocDto {
  id: string;
  mocNumber: string;
  title: string;
  sponsorDepartment: string;
  progressPercentage: number;
  status: MocStatus;
  createdAt: string;
  updatedAt: string;
}
