export type SafetyReportCategory = 'HAZARD' | 'INCIDENT' | 'OCCURRENCE' | 'TECHNICAL_FINDING';
export type SafetyReportStatus = 'SUBMITTED' | 'UNDER_INVESTIGATION' | 'CAPA_ISSUED' | 'CLOSED';

export interface SafetyReportDto {
  id: string;
  reportNumber: string;
  reportCategory: SafetyReportCategory;
  stationId: string | null;
  aircraftId: string | null;
  flightOperationId: string | null;
  description: string;
  isAnonymous: boolean;
  reportedByUserId: string | null;
  evidenceIdsJson: string;
  status: SafetyReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyReportInput {
  reportCategory: SafetyReportCategory;
  stationId?: string;
  aircraftId?: string;
  flightOperationId?: string;
  description: string;
  isAnonymous?: boolean;
  reportedByUserId?: string;
  evidenceIdsJson?: string;
}

export interface SafetyReportListQuery {
  status?: SafetyReportStatus;
  category?: SafetyReportCategory;
  stationId?: string;
  search?: string;
}
