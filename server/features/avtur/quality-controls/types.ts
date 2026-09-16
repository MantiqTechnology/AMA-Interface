export interface QualityControlVerificationDto {
  id: string;
  assetId: string;
  verifiedBy: string;
  physicalSnInput: string;
  cocDocumentSnInput: string;
  verificationResult: 'MATCH_OK' | 'MISMATCH_REJECT';
  notes: string | null;
  verifiedAt: string;
}

export interface VerifyCocInput {
  assetId: string;
  verifiedBy: string;
  physicalSnInput: string;
  cocDocumentSnInput: string;
  notes?: string;
}