export type RegulatoryReportType = 'MOR' | 'SDR' | 'OTHER';
export type RegulatoryReportStatus = 'DRAFT' | 'GENERATED' | 'SUBMITTED' | 'ACKNOWLEDGED';

export interface RegulatoryReportDto {
  id: string;
  referenceNumber: string;
  sourceReportId: string | null;
  reportType: RegulatoryReportType;
  targetAuthority: string;
  generatedByUserId: string;
  generatedAt: string;
  submittedAt: string | null;
  authorityReceiptNumber: string | null;
  status: RegulatoryReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RegulatoryReportInput {
  sourceReportId?: string; // ID Laporan internal (Hazard/Incident) yang memicu MOR ini
  reportType?: RegulatoryReportType; 
  targetAuthority?: string;
  generatedByUserId: string;
}

export interface RegulatoryReportListQuery {
  status?: RegulatoryReportStatus;
  reportType?: RegulatoryReportType;
  search?: string;
}