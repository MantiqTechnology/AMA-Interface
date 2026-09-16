export interface FuelDrumDto {
  id: string;
  stationId: string;
  assetCode: string;
  assetName: string;
  serialNumberPhysical: string;
  operationalStatus: string;
  installedAt: string | null;
}

export interface FuelDrumListQuery {
  stationId?: string;
  search?: string;
}