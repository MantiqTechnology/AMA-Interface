export type AssetCategory = 'SKID_ASSEMBLY' | 'FLOWMETER_BLE' | 'SOLENOID_VALVE' | 'RFID_TAG' | 'EFB_TABLET';
export type CocStatus = 'PENDING' | 'OK' | 'REJECT';
export type OperationalStatus = 'ACTIVE' | 'INSPECTION_DUE' | 'QUARANTINE' | 'DECOMMISSIONED';

export interface BleUltrasonicDeviceDto {
  id: string;
  stationId: string;
  assetCode: string;
  assetName: string;
  category: AssetCategory;
  brandModel: string | null;
  serialNumberPhysical: string;
  serialNumberCoc: string;
  exRating: string | null;
  cocStatus: CocStatus;
  operationalStatus: OperationalStatus;
  installedAt: string | null;
  lastCalibratedAt: string | null;
}

export interface BleUltrasonicDeviceInput {
  stationId: string;
  assetCode: string;
  assetName: string;
  category?: AssetCategory;
  brandModel?: string;
  serialNumberPhysical: string;
  serialNumberCoc: string;
  exRating?: string;
  cocStatus?: CocStatus;
  operationalStatus?: OperationalStatus;
  lastCalibratedAt?: string;
}

export interface BleDeviceListQuery {
  stationId?: string;
  category?: AssetCategory;
  operationalStatus?: OperationalStatus;
  search?: string;
}

export interface BleTelemetrySyncInput {
  deviceId: string;
  scannedByUserId: string;
  rawDistanceCm: number;
  tankHeightCm: number;
  recordedAt: string;
}

export interface TelemetrySyncResultDto {
  deviceId: string;
  assetCode: string;
  calculatedVolumeLiter: number;
  remainingFluidHeightCm: number;
  syncedAt: string;
}