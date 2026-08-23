export type RiskZone = 'GREEN' | 'YELLOW' | 'RED';
export type FratStatus = 'DRAFT' | 'SUBMITTED' | 'OVERRIDDEN' | 'CLEARED';

export interface FratAssessmentDto {
  id: string;
  flightOperationId: string;
  picEmployeeId: string;
  crewFatigueScore: number;
  weatherRiskScore: number;
  airstripRatingScore: number;
  totalRiskScore: number;
  riskZone: RiskZone;
  isHardLocked: boolean;
  overrideSignoffByUserId: string | null;
  overrideReason: string | null;
  status: FratStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FratAssessmentInput {
  flightOperationId: string;
  picEmployeeId: string;
  crewFatigueScore: number;
  weatherRiskScore: number;
  airstripRatingScore: number;
}