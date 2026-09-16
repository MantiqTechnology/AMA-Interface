export type CompetencyType = 'SMS_INITIAL' | 'CRM_HF' | 'DANGEROUS_GOODS' | 'CFIT_ALAR' | 'MOUNTAIN_VALLEY_CHECK';
export type CompetencyStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_APPLICABLE';

export type RiskSeverity = '1' | '2' | '3' | '4' | '5';
export type RiskLikelihood = 'A' | 'B' | 'C' | 'D' | 'E';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskStatus = 'ACTIVE' | 'MITIGATED' | 'CLOSED';

export type DecisionPath = 'HUMAN_ERROR' | 'AT_RISK_BEHAVIOR' | 'RECKLESS_CONDUCT';
export type JustCultureAction = 'SYSTEM_FIX_TRAINING' | 'COACHING_COUNSELING' | 'DISCIPLINARY';

export interface PersonnelCompetencyDto {
  id: string;
  personnelId: string;
  personnelName?: string;
  licenseNumber?: string;
  role?: string;
  stationCode?: string;
  competencyType: CompetencyType;
  certificateNumber: string | null;
  issuedAt: string;
  expiresAt: string | null;
  status: CompetencyStatus;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateRiskDto {
  id: string;
  riskCode: string;
  title: string;
  hazardDescription: string;
  initialSeverity: RiskSeverity;
  initialLikelihood: RiskLikelihood;
  initialRiskIndex: string;
  initialRiskLevel: RiskLevel;
  mitigationBarriers: string;
  residualSeverity: RiskSeverity;
  residualLikelihood: RiskLikelihood;
  residualRiskIndex: string;
  residualRiskLevel: RiskLevel;
  riskOwnerRole: string;
  reviewFrequency: 'MONTHLY' | 'BI_MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  lastReviewedAt: string | null;
  status: RiskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyPolicyDto {
  id: string;
  policyCode: string;
  title: string;
  revision: string;
  signeeRole: string;
  effectiveFrom: string;
  validUntil: string;
  documentId: string | null;
  acknowledgementRequired: boolean;
  status: 'ACTIVE' | 'UNDER_REVISION' | 'SUPERSEDED';
  createdAt: string;
  updatedAt: string;
}

export interface JustCultureAssessmentDto {
  id: string;
  sourceReportId: string;
  decisionPath: DecisionPath;
  actionType: JustCultureAction;
  isNonPunitiveProtected: boolean;
  justificationNotes: string;
  assessedByUserId: string;
  assessedAt: string;
  createdAt: string;
}

export interface SafetyTrainingSummaryDto {
  trainingCompliancePercent: number;
  overdueCertificatesCount: number;
  activeCorporateRisksCount: number;
  justCultureStats: {
    humanErrorPercent: number;
    atRiskPercent: number;
    recklessPercent: number;
    openReportingPercent: number;
  };
}

export interface CompetencyMatrixQuery {
  personnelId?: string;
  competencyType?: CompetencyType;
  status?: CompetencyStatus;
  search?: string;
}

export interface CorporateRiskInput {
  riskCode: string;
  title: string;
  hazardDescription: string;
  initialSeverity: RiskSeverity;
  initialLikelihood: RiskLikelihood;
  initialRiskIndex: string;
  initialRiskLevel: RiskLevel;
  mitigationBarriers: string;
  residualSeverity: RiskSeverity;
  residualLikelihood: RiskLikelihood;
  residualRiskIndex: string;
  residualRiskLevel: RiskLevel;
  riskOwnerRole: string;
  reviewFrequency?: 'MONTHLY' | 'BI_MONTHLY' | 'QUARTERLY' | 'ANNUAL';
}

export interface JustCultureInput {
  sourceReportId: string;
  decisionPath: DecisionPath;
  actionType: JustCultureAction;
  isNonPunitiveProtected?: boolean;
  justificationNotes: string;
  assessedByUserId: string;
}