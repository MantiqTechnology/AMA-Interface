export type AvturWorkflowType =
  | 'DPPU_TO_AIRCRAFT'
  | 'DPPU_TO_DRUM'
  | 'DRUM_TRANSFER'
  | 'DRUM_TO_AIRCRAFT'
  | 'CONSOLIDATION';

export interface AvturTransactionDto {
  id: string;
  transactionNo: string;
  workflowType: AvturWorkflowType;
  sourceAssetId: string;
  targetAssetId: string | null;
  flightMissionId: string | null;
  aircraftTailNo: string | null;
  flowmeterStartKg: number;
  flowmeterEndKg: number;
  totalVolumeLiters: number;
  densityMeasured: number;
  temperatureCelsius: number;
  groundingVerified: boolean;
  swdTestPassed: boolean;
  sealIntact: boolean;
  settlingTimePassed: boolean;
  solenoidCutoffTriggered: boolean;
  operatorId: string;
  syncedFromDevice: boolean;
  createdTimestamp: string;
}

export interface CreateAvturTransactionInput {
  workflowType: AvturWorkflowType;
  sourceAssetId: string;
  targetAssetId?: string | null;
  flightMissionId?: string | null;
  aircraftTailNo?: string | null;
  flowmeterStartKg: number;
  flowmeterEndKg: number;
  totalVolumeLiters: number;
  densityMeasured: number;
  temperatureCelsius: number;
  groundingVerified: boolean;
  swdTestPassed: boolean;
  sealIntact: boolean;
  settlingTimePassed: boolean;
  operatorId: string;
  syncedFromDevice?: boolean;
}

export interface AvturTransactionListQuery {
  workflowType?: AvturWorkflowType;
  sourceAssetId?: string;
  operatorId?: string;
  aircraftTailNo?: string;
  search?: string;
}