export interface MaintenanceRecordDto {
  assetId: string;
  assetCode: string;
  operationalStatus: string;
  lastCalibratedAt: string | null;
}

export interface UpdateCalibrationInput {
  assetId: string;
  calibratedAt: string;
}