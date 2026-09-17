import type { OperationalStatus } from '../iot-devices/types';

export interface FuelSkidDto {
  id: string;
  stationId: string;
  assetCode: string;
  assetName: string;
  brandModel: string | null;
  serialNumberPhysical: string;
  operationalStatus: OperationalStatus;
  installedAt: string | null;
  lastCalibratedAt: string | null;
}

export interface FuelSkidListQuery {
  stationId?: string;
  operationalStatus?: OperationalStatus;
  search?: string;
}